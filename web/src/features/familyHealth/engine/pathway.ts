import { GENOMIC, PEOPLE } from '../data/people'
import { FIRST_UP_TO, PRIORITY, PRIORITY_DEFAULT, PRIORITY_NORMAL, PRIORITY_RAISED, PROGRAMMES, URGENCY, URGENCY_ORDER } from '../data/programmes'
import type { AdultProfile, ChildProfile, FhParams, PersonId, PrefId, ProgId, ScrStatus, TimeId, Txt, UrgencyId } from '../data/types'
import { forecast, pct } from './framingham'
import { famHas, scrStatus, type FamRow, type Signal } from './flags'
import type { DinResult, QResult } from './home'
import { date, tx } from './text'

/**
 * Right pathway: the population priority (programmes Noa may book, from the guideline for age and sex, fitted to the person's
 * time, place and clinician preference) kept apart from clinical decisions (what only the doctor decides), each with an urgency
 * level and a due-by date (rule U1). Ported from the prototype buildPath / urgency / dueBy.
 */

/** A population item (one programme). */
export interface PopItem { id: ProgId; name: Txt; short: Txt; rule: Txt; you: Txt; st: ScrStatus; where: Txt; when: Txt; kit: boolean; u: UrgencyId }
/** A clinical item: `id` names the decision (text `clin.<id>.t`, short form `clin.<id>.short`). */
export type ClinId =
  | 'urgentDoc' | 'medReview' | 'symThirst' | 'symBowel' | 'symBreast' | 'symChest' | 'childDev' | 'childEye' | 'childHearing' | 'childFh'
  | 'genomic' | 'brca' | 'bone' | 'fhpar' | 'stroke' | 'hearing' | 'falls' | 'sleep' | 'mood' | 'heart' | 'bp'
export interface ClinItem { id: ClinId; t: Txt; short: Txt; why: Txt; u: UrgencyId }
export interface Pathway { pop: PopItem[]; clin: ClinItem[]; time: TimeId; slot: Txt; slotDay: Txt }

/** What the home screening found, as the pathway reads it. */
export interface HomeAnswers {
  sym?: string; pref?: PrefId | string; time?: TimeId; quit?: string; dev?: boolean; vision?: string; hearing?: string
}
export interface HomeResults { dmrisk?: QResult; din?: DinResult; falls?: QResult; stopbang?: QResult; phq2?: QResult }
export interface PathInput {
  k: PersonId
  p: AdultProfile | ChildProfile
  urgent: Signal | null
  ans: HomeAnswers
  vt: HomeResults
  genomic: boolean
  fam: FamRow[]
}

/** Clinical urgency by decision (prototype `urgency` regexes). B11: every "Doctor appointment this week" is within 1 week. */
const CLIN_URGENCY: Record<ClinId, UrgencyId> = {
  urgentDoc: 'today', medReview: 'h24', symThirst: 'w1', symBowel: 'w1', symBreast: 'w1', symChest: 'w1',
  mood: 'w2', heart: 'w2', stroke: 'w2',
  childDev: 'm1', childEye: 'm1', childHearing: 'm1', falls: 'm1', genomic: 'm1', bp: 'm1',
  childFh: 'm3', brca: 'm3', bone: 'm3', fhpar: 'm3', hearing: 'm3', sleep: 'm3',
}
const SYM_CLIN: Record<string, ClinId> = { thirst: 'symThirst', bowel: 'symBowel', breast: 'symBreast', chest: 'symChest' }

export const urgencyIndex = (u: UrgencyId): number => URGENCY_ORDER.indexOf(u)
/** "act now", "same-day appointment" or "by Sun 20 Dec" from the simulated clock. */
export function dueBy(u: UrgencyId, clock: number): Txt {
  if (u === 'now') return tx('urgency.due.now')
  if (u === 'today') return tx('urgency.due.today')
  return tx('urgency.due.by', { date: date(clock + URGENCY[u].days * 864e5) })
}

export function buildPath(x: PathInput): Pathway {
  const { k, p, ans: A } = x
  const m = PEOPLE[k], time: TimeId = A.time ?? 'sat'
  const slot = tx(`slots.${time}.full`), pop: PopItem[] = [], clin: ClinItem[] = []
  const fhc = tx(`people.${k}.clinicShort`)
  const where = (id: ProgId): Txt => {
    if (m.child) return tx('where.children', { clinic: tx(`people.${k}.clinic`) })
    if (A.pref === 'home' && PROGRAMMES[id].home) return tx('where.kit', { home: tx(`people.${k}.home`) })
    if (id === 'breast' || id === 'cervix') return tx(A.pref === 'female' || k === 'moza' ? 'where.womenOnly' : 'where.women', { fhc })
    if (k === 'saeed' && /dm/.test(id)) return tx('where.diabetesClinic')
    return fhc
  }
  const addP = (id: ProgId, you: Txt, st: ScrStatus = 'due') => {
    if (pop.some((y) => y.id === id) || !PROGRAMMES[id]) return
    const kit = !!PROGRAMMES[id].home && A.pref !== 'one'
    pop.push({ id, name: tx(`prog.${id}.name`), short: tx(`prog.${id}.short`), rule: tx(`prog.${id}.who`), you, st, where: kit ? tx('where.kitHome', { home: tx(`people.${k}.home`) }) : where(id), when: kit ? tx('when.post') : slot, kit, u: 'm3' })
  }
  const addC = (id: ClinId, why: Txt, p2?: FhParams) => clin.push({ id, t: tx(`clin.${id}.t`, p2), short: tx(`clin.${id}.short`, p2), why, u: 'm3' })

  if (x.urgent) addC('urgentDoc', tx('clin.urgentDoc.why', { rule: x.urgent.rule }), { signal: x.urgent.text })
  const symId = A.sym ? SYM_CLIN[A.sym] : undefined
  if (symId) addC(symId, tx('clin.symWhy'))

  if (p.child) {
    const growth = famHas(x.fam, 'growth')
    if (k === 'hind') {
      addP('well', tx(growth ? 'you.hindGrowth' : 'you.hind', { w: p.overdueW }), 'overdue')
      addP('mchat', tx('you.mchat'), 'overdue')
      if (A.dev) addC('childDev', tx('clin.childDev.why'))
    } else {
      addP('well', tx(growth ? 'you.hamdanGrowth' : 'you.hamdan'), 'due')
      addP('school', tx('you.school'), 'due')
      if (A.vision === 'squint') addC('childEye', tx('clin.childEye.why'))
      if (A.hearing === 'repeat') addC('childHearing', tx('clin.childHearing.why'))
    }
    if (famHas(x.fam, 'fhkid')) addC('childFh', tx('clin.childFh.why'))
    urgency(x, pop, clin)
    return { pop, clin, time, slot, slotDay: tx(`slots.${time}.day`) }
  }

  const gen = !!GENOMIC[k] && x.genomic
  const pri: Partial<Record<ProgId, number>> = { ...PRIORITY, lipid: gen ? PRIORITY_RAISED : PRIORITY_NORMAL, a1c: p.gdm || A.sym === 'thirst' ? PRIORITY_RAISED : PRIORITY_NORMAL }
  const prio = (id: ProgId) => pri[id] ?? PRIORITY_DEFAULT
  const S = scrStatus(k, p).filter((r) => (r.st === 'overdue' || r.st === 'due') && r.prog in PROGRAMMES)
  S.sort((a, b) => (a.st === 'overdue' ? 0 : 1) - (b.st === 'overdue' ? 0 : 1) || prio(a.prog as ProgId) - prio(b.prog as ProgId))
  for (const r of S) {
    const id = r.prog as ProgId
    if (id === 'bowel' && A.sym === 'bowel') continue
    if (id === 'breast' && A.sym === 'breast') continue
    if (id === 'a1c' && A.sym === 'thirst') continue
    const you: Txt =
      id === 'dmeye' ? tx('you.dmeye', { last: r.last })
      : id === 'dmkid' ? tx('you.dmkid', { last: r.last })
      : id === 'bowel' ? (r.never ? tx('you.bowelNever', { age: p.age }) : tx('you.bowel', { age: p.age, last: r.last }))
      : id === 'breast' ? tx('you.breast', { age: p.age, last: r.last })
      : id === 'cervix' ? tx('you.cervix', { last: r.last })
      : id === 'dxa' ? tx('you.dxa', { age: p.age })
      : id === 'ifhas' ? (r.never ? tx('you.ifhasNever') : tx('you.ifhas', { last: r.last }))
      : id === 'lipid' ? tx(gen ? 'you.lipidGen' : 'you.lipid')
      : id === 'a1c' ? tx(p.gdm ? 'you.a1cGdm' : 'you.a1c')
      : id === 'flu' ? tx('you.flu')
      : r.name
    addP(id, you, r.st)
  }
  if (gen && !pop.some((y) => y.id === 'lipid')) addP('lipid', tx('you.lipidGenAdded'), 'overdue')
  if (pop.some((y) => y.id === 'lipid') && pop.some((y) => y.id === 'ifhas')) { const l = pop.find((y) => y.id === 'lipid') as PopItem; l.where = tx('where.sameDraw') }
  pop.sort((a, b) => prio(a.id) - prio(b.id) || (a.st === 'overdue' ? 0 : 1) - (b.st === 'overdue' ? 0 : 1))
  if (p.smoker && A.quit === 'yes') addP('quit', tx('you.quit'), 'due')
  if (gen) addC('genomic', tx('clin.genomic.why'))
  if (famHas(x.fam, 'brca')) addC('brca', tx(p.age < 40 ? 'clin.brca.whyUnder40' : 'clin.brca.why'))
  if (famHas(x.fam, 'bone')) addC('bone', tx('clin.bone.why'))
  if (famHas(x.fam, 'fhpar')) addC('fhpar', tx('clin.fhpar.why'))
  if (famHas(x.fam, 'dm') && !pop.some((y) => y.id === 'a1c') && !pop.some((y) => y.id === 'ifhas') && !p.dm) addP('a1c', tx('you.a1cParent'), 'due')
  if (p.cvd && k === 'moza') addC('stroke', tx('clin.stroke.why'))
  const V = x.vt
  if (V.dmrisk && V.dmrisk.score >= 5 && !pop.some((y) => y.id === 'a1c')) addP('a1c', tx('you.a1cRisk', { n: V.dmrisk.score }), 'due')
  if (V.din && V.din.refer) addC('hearing', tx('clin.hearing.why', { result: V.din.txt }))
  if (V.falls && V.falls.score) addC('falls', tx('clin.falls.why', { result: V.falls.txt }))
  if (V.stopbang && V.stopbang.score >= 3) addC('sleep', tx('clin.sleep.why', { result: V.stopbang.txt }))
  if (V.phq2 && V.phq2.score >= 3) addC('mood', tx('clin.mood.why', { result: V.phq2.txt }))
  const f = forecast(p)
  if (f.ok && f.cat === 'high') addC('heart', tx('clin.heart.why', { pct: pct(f.r) }))
  if (p.bpTx && p.sbp >= 140) addC('bp', tx('clin.bp.why', { sbp: p.sbp, dbp: p.dbp }))
  urgency(x, pop, clin)
  return { pop, clin, time, slot, slotDay: tx(`slots.${time}.day`) }
}

function urgency(x: PathInput, pop: PopItem[], clin: ClinItem[]) {
  const l1 = x.urgent?.rule === 'L1'
  clin.forEach((c) => { c.u = c.id === 'urgentDoc' && l1 ? 'h24' : CLIN_URGENCY[c.id] })
  clin.sort((a, b) => urgencyIndex(a.u) - urgencyIndex(b.u))
  const gen = !!GENOMIC[x.k] && x.genomic
  pop.forEach((y) => { y.u = y.id === 'well' && y.st === 'overdue' ? 'w2' : y.id === 'lipid' && gen ? 'm1' : y.st === 'overdue' ? 'm1' : 'm3' })
  if (l1 && clin[0] && x.urgent && !x.p.child) {
    const glu = (x.p as AdultProfile).glu
    clin[0] = { ...clin[0], id: 'medReview', t: tx('clin.medReview.t', { glu }), short: tx('clin.medReview.short') }
  }
}

/** The first clinical item when it is urgent enough to lead the offer ("first and most urgent"), else null. */
export const leadItem = (path: Pathway): ClinItem | null => (path.clin[0] && urgencyIndex(path.clin[0].u) <= urgencyIndex(FIRST_UP_TO) ? path.clin[0] : null)
