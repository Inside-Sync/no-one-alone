import { CONDS, EXT_FAMILY, GENOMIC, PEOPLE, RECORDS, REL, isProg, type CondCode } from '../data/people'
import { ELIGIBLE, FAMILY, SIGNAL } from '../data/thresholds'
import type { AdultProfile, PersonId, Profile, RuleId, ScrProg, ScrStatus, SignalLevel, SignalRuleId, Tone, Txt } from '../data/types'
import { PERSON_IDS } from '../data/types'
import { forecast, pct } from './framingham'
import { fixed, lc, list, tx } from './text'

/**
 * Detect: today's signal rules, the screening history against the guideline, the family health record working and the
 * transparent flags (rule D1: factors, source, certainty). Ported from the prototype signalRules / scrStatus / famWorking /
 * famEffect / detectFlags.
 */

const name = (k: PersonId): Txt => tx(`people.${k}.name`)

export interface Signal { rule: SignalRuleId; level: SignalLevel; text: Txt }

/** Today's signal rules for an adult, in the prototype order. */
export function signalRules(k: PersonId, p: AdultProfile): Signal[] {
  const f: Signal[] = []
  if (p.glu != null && p.glu < SIGNAL.gluL2) f.push({ rule: 'L1', level: 'today', text: tx('signal.L1', { glu: p.glu }) })
  else if (p.glu != null && p.glu < SIGNAL.gluL1) f.push({ rule: 'L2', level: 'soon', text: tx('signal.L2', { glu: p.glu }) })
  if (p.hr >= SIGNAL.hrHigh) f.push({ rule: 'G1', level: 'now', text: tx('signal.G1', { hr: p.hr, name: name(k), usual: tx(`people.${k}.usual`) }) })
  if (p.hr < SIGNAL.hrLow) f.push({ rule: 'G3', level: 'now', text: tx('signal.G3', { hr: p.hr }) })
  const veryHigh = p.sbp >= SIGNAL.sbpVeryHigh || p.dbp >= SIGNAL.dbpVeryHigh
  if (veryHigh) f.push({ rule: 'B1', level: 'today', text: tx('signal.B1', { sbp: p.sbp, dbp: p.dbp }) })
  if (p.spo2 < SIGNAL.spo2Low) f.push({ rule: 'O1', level: 'today', text: tx('signal.O1', { spo2: p.spo2 }) })
  if (p.irrAlerts > 0) f.push({ rule: 'G2', level: 'soon', text: tx(p.irrAlerts > 1 ? 'signal.G2many' : 'signal.G2one', { n: p.irrAlerts }) })
  if (!veryHigh && (p.sbp >= SIGNAL.sbpHigh || p.dbp >= SIGNAL.dbpHigh)) f.push({ rule: 'B2', level: 'soon', text: tx('signal.B2', { sbp: p.sbp, dbp: p.dbp }) })
  if (p.bmi >= SIGNAL.bmiHigh) f.push({ rule: 'W1', level: 'plan', text: tx('signal.W1', { bmi: p.bmi }) })
  if (p.steps < SIGNAL.stepsLow) f.push({ rule: 'A1', level: 'plan', text: tx('signal.A1', { steps: p.steps }) })
  if (p.smoker) f.push({ rule: 'K1', level: 'plan', text: tx('signal.K1') })
  return f
}
/** The urgent signal (now or today) that makes Noa prompt a check by itself, if any. */
export const urgentOf = (f: Signal[]): Signal | null => f.find((x) => x.level === 'now' || x.level === 'today') ?? null

/* ---------------------------------------------------------------- screening history */

export interface ScrRow { key: string | null; prog: ScrProg; name: Txt; last: Txt; every: Txt; st: ScrStatus; dated: boolean; never: boolean }

/** The person's screening history with the guideline for age and sex applied (prototype scrStatus). */
export function scrStatus(k: PersonId, p: Profile): ScrRow[] {
  const out: ScrRow[] = RECORDS[k].scr.map((x) => ({
    key: x.key, prog: x.prog, st: x.st, dated: x.dated, never: !!x.never,
    name: tx(`records.${k}.scr.${x.key}.name`), last: tx(`records.${k}.scr.${x.key}.last`), every: tx(`records.${k}.scr.${x.key}.every`),
  }))
  if (p.child) return out
  const has = (id: ScrProg) => out.some((x) => x.prog === id)
  const add = (id: 'bowel' | 'ifhas' | 'dxa' | 'breast' | 'cervix', cond: boolean) => {
    const e = out.find((x) => x.prog === id)
    if (cond && e && (e.st === 'not yet' || e.st === 'ended')) e.st = 'due'
    if (cond && !e) out.push({ key: null, prog: id, name: tx(`prog.${id}.name`), last: tx('common.never'), every: tx(`prog.${id}.who`), st: 'due', dated: false, never: true })
    if (!cond && e && e.st !== 'done') e.st = e.dated ? 'ended' : 'not yet'
  }
  add('bowel', p.age >= ELIGIBLE.bowel[0] && p.age <= ELIGIBLE.bowel[1])
  add('ifhas', p.emirati && p.age >= ELIGIBLE.ifhas[0] && p.age <= ELIGIBLE.ifhas[1])
  if (p.sex === 'F') add('dxa', p.age >= ELIGIBLE.dxaFrom)
  if (p.sex === 'F') {
    add('breast', p.age >= ELIGIBLE.breast[0] && p.age <= ELIGIBLE.breast[1])
    add('cervix', p.age >= ELIGIBLE.cervix[0] && p.age <= ELIGIBLE.cervix[1])
  } else out.filter((x) => x.prog === 'breast' || x.prog === 'cervix').forEach((x) => { x.st = 'not yet' })
  if (p.dm && !has('dmeye')) out.push({ key: null, prog: 'dmeye', name: tx('prog.dmeye.name'), last: tx('common.never'), every: tx('common.everyYear'), st: 'due', dated: false, never: true })
  return out
}
export const scrCounts = (rows: ScrRow[]) => ({ overdue: rows.filter((x) => x.st === 'overdue').length, due: rows.filter((x) => x.st === 'due').length })
export const progRows = (rows: ScrRow[]) => rows.filter((x) => isProg(x.prog))

/* ---------------------------------------------------------------- family health record */

export type RelId = 'father' | 'mother' | 'son' | 'daughter' | 'child' | 'brother' | 'sister' | 'grandfather' | 'grandmother'
/** What a relative's condition changes for this person (null: considered, no change). */
export type FamEffect = 'growth' | 'dm' | 'bp' | 'fhkid' | 'fhpar' | 'brca' | 'cvdfh' | 'bone' | null
export interface FamRow {
  /** The relative's name (in the passport) or null when only the relation is known (outside the passport). */
  who: Txt | null
  rel: RelId | null
  /** Relation label: "Father", or for relatives outside the passport the reported label ("Father (late Abdullah)"). */
  relLabel: Txt
  deg: 1 | 2
  cond: Txt
  onset: number | null
  src: Txt
  /** "Rule → effect" as shown in the working table, and the effect part alone (used in the X1 flag). */
  rule: Txt
  effectText: Txt
  eff: FamEffect
}
/** Context the family rules need: has Khalid shared his genomic result (this journey or an earlier referral)? */
export interface FamCtx { fhShared: boolean }

function relOf(k: PersonId, other: PersonId): [RelId, 1 | 2] | null {
  const r = REL[k], x = PEOPLE[other]
  if ((r.parents ?? []).includes(other)) return [x.role === 'grandpa' || x.role === 'dad' ? 'father' : 'mother', 1]
  if ((r.kids ?? []).includes(other)) return [x.role === 'son' ? 'son' : x.role === 'daughter' ? 'daughter' : 'child', 1]
  if ((r.sib ?? []).includes(other)) return [x.role === 'son' ? 'brother' : 'sister', 1]
  const gp = (r.parents ?? []).flatMap((q) => REL[q].parents ?? [])
  if (gp.includes(other)) return [x.role === 'grandpa' ? 'grandfather' : 'grandmother', 2]
  return null
}

function famEffect(k: PersonId, p: Profile, risk: CondCode, deg: 1 | 2, rel: RelId, onset: number | null, ctx: FamCtx): [string, FamEffect, number | null] {
  const adult = !p.child
  if (risk === 'dm') {
    if (!adult) return deg === 1 ? ['dmChild1', 'growth', null] : ['dmChild2', null, null]
    if (p.dm) return ['dmHas', null, null]
    return ['dmAdult', 'dm', null]
  }
  if (risk === 'htn') {
    if (!adult) return ['childNoChange', null, null]
    return deg === 1 ? ['htnParent', 'bp', null] : ['noChange', null, null]
  }
  if (risk === 'fh') {
    if (!ctx.fhShared) return ['fhNotShared', null, null]
    if (!adult) return ['fhChild', 'fhkid', null]
    if (rel === 'son') return ['fhParent', 'fhpar', null]
    return ['noChange', null, null]
  }
  if (risk === 'gdm') return adult ? ['noChange', null, null] : ['gdmChild', 'growth', null]
  if (risk === 'brca') return ['brca', 'brca', null]
  if (risk === 'stroke' || risk === 'cvd') {
    const female = rel === 'mother' || rel === 'sister'
    const prem = onset != null && (female ? onset < FAMILY.prematureFemale : onset < FAMILY.prematureMale)
    if (!adult) return ['childNoChange', null, null]
    return prem ? ['cvdPrem', 'cvdfh', null] : ['cvdNotPrem', null, onset]
  }
  if (risk === 'osteo') return !p.child && p.age >= FAMILY.dxaFrom ? ['osteoOld', null, null] : ['osteoYoung', 'bone', null]
  return ['noChange', null, null]
}

/** How Noa uses the family health record for this person: one row per relative's condition (prototype famWorking). */
export function famWorking(k: PersonId, profiles: Record<PersonId, Profile>, ctx: FamCtx): FamRow[] {
  const p = profiles[k], rows: FamRow[] = []
  for (const x of PERSON_IDS) {
    if (x === k) continue
    const ro = relOf(k, x)
    if (!ro) continue
    for (const c of CONDS[x]) {
      const [key, eff, on] = famEffect(k, p, c.cond, ro[1], ro[0], c.onset, ctx)
      const src = c.cond === 'fh' ? tx(eff ? 'fam.src.fhShared' : 'fam.src.fhNotShared') : tx('fam.src.record', { name: name(x) })
      rows.push({ who: name(x), rel: ro[0], relLabel: tx(`fam.rel.${ro[0]}`), deg: ro[1], cond: tx(`fam.cond.${c.cond}`), onset: c.onset, src, rule: tx(`fam.eff.${key}.rule`, { onset: on }), effectText: tx(`fam.eff.${key}.effect`, { onset: on }), eff })
    }
  }
  for (const c of EXT_FAMILY[k] ?? []) {
    const [key, eff, on] = famEffect(k, p, c.cond, 1, c.rel, c.onset, ctx)
    rows.push({ who: null, rel: c.rel, relLabel: tx(`famExt.${k}`), deg: 1, cond: tx(`fam.cond.${c.cond}`), onset: c.onset, src: tx('fam.src.reported', { name: name(k) }), rule: tx(`fam.eff.${key}.rule`, { onset: on }), effectText: tx(`fam.eff.${key}.effect`, { onset: on }), eff })
  }
  return rows
}
export const famHas = (rows: FamRow[], eff: FamEffect): boolean => rows.some((r) => r.eff === eff)

/* ---------------------------------------------------------------- flags (rule D1) */

export type FlagLevel = Tone | 'good'
export interface Flag { rule: RuleId; title: Txt; lvl: FlagLevel; factors: Txt[]; src: Txt; cert: Txt; gen?: true }

const FACTOR_KEY: Partial<Record<SignalRuleId, string>> = { G1: 'G1', G3: 'G3', B1: 'B1', O1: 'O1', G2: 'G2', B2: 'B2', W1: 'W1', A1: 'A1', K1: 'K1' }
function signalSource(rule: SignalRuleId): string {
  if (rule === 'K1') return 'flag.src.passport'
  if (rule === 'W1') return 'flag.src.scale'
  if (rule.startsWith('B')) return 'flag.src.cuff'
  if (rule === 'L1' || rule === 'L2') return 'flag.src.cgm'
  return 'flag.src.watch'
}

/** The transparent flags, in the prototype order (signals, F1, last record, overdue, due, T1, X1, P1 genomic, T2). */
export function detectFlags(k: PersonId, profiles: Record<PersonId, Profile>, signals: Signal[], opts: { genomic: boolean; fam: FamRow[] }): Flag[] {
  const p = profiles[k], out: Flag[] = []
  for (const x of signals) {
    const fk = FACTOR_KEY[x.rule]
    out.push({
      rule: x.rule, title: x.text, lvl: x.level === 'now' || x.level === 'today' ? 'bad' : x.level === 'soon' ? 'warn' : 'info',
      factors: [fk ? tx(`flag.why.${fk}`, { name: name(k), thr: SIGNAL.hrHigh }) : x.text],
      src: tx(signalSource(x.rule)), cert: x.rule === 'K1' ? tx('flag.cert.reported', { name: name(k) }) : tx('flag.cert.measured'),
    })
  }
  const f = forecast(p)
  if (f.ok && !p.child) {
    out.push({
      rule: 'F1', title: tx('flag.F1.title', { pct: pct(f.r), cat: tx(`risk.${f.cat}`) }), lvl: f.cat === 'high' ? 'bad' : f.cat === 'moderate' ? 'warn' : 'good',
      factors: [
        tx('flag.F1.age', { age: p.age }),
        p.sbpTrend > 0 ? tx('flag.F1.bpRising', { sbp: p.sbp, trend: p.sbpTrend }) : tx('flag.F1.bp', { sbp: p.sbp }),
        tx(p.smoker ? 'flag.F1.smokes' : 'flag.F1.nonSmoker'),
        tx(p.dm ? 'flag.F1.dm' : 'flag.F1.noDm'),
        // B7: HDL 1.0 is written "1.0", not "1".
        f.lab ? tx('flag.F1.chol', { tc: fixed(p.tc as number, 1), hdl: fixed(p.hdl as number, 1) }) : tx('flag.F1.bmi', { bmi: p.bmi }),
      ],
      src: tx('flag.F1.src'), cert: tx(f.lab ? 'flag.F1.certLab' : 'flag.F1.certBmi'),
    })
  }
  out.push({
    rule: 'N1', title: tx('flag.last.title', { date: tx(`people.${k}.lastDate`) }), lvl: 'info',
    factors: [tx(`people.${k}.last`), tx('flag.last.conditions', { hist: tx(`people.${k}.hist`) }), tx('flag.last.medicines', { meds: tx(`people.${k}.meds`) })],
    src: tx('flag.last.src', { clinic: tx(`people.${k}.clinic`) }), cert: tx('flag.cert.record'),
  })
  const S = scrStatus(k, p), od = S.filter((x) => x.st === 'overdue'), du = S.filter((x) => x.st === 'due')
  if (od.length) out.push({ rule: 'N1', title: tx(od.length > 1 ? 'flag.overdue.many' : 'flag.overdue.one', { n: od.length }), lvl: 'warn', factors: od.map((x) => tx('flag.overdue.line', { name: x.name, last: x.last, every: x.every })), src: tx('flag.overdue.src'), cert: tx('flag.cert.record') })
  if (du.length) out.push({ rule: 'N1', title: tx(du.length > 1 ? 'flag.due.many' : 'flag.due.one', { n: du.length }), lvl: 'info', factors: du.map((x) => tx('flag.due.line', { name: x.name, last: x.last })), src: tx('flag.due.src'), cert: tx('flag.cert.record') })
  if (!p.child && p.gdm) out.push({ rule: 'T1', title: tx('flag.gdm.title'), lvl: 'warn', factors: [tx('flag.gdm.f1'), tx('flag.gdm.f2')], src: tx('flag.gdm.src'), cert: tx('flag.cert.record') })
  const fw = opts.fam.filter((r) => r.eff)
  if (fw.length) {
    out.push({
      rule: 'X1', title: tx(fw.length > 1 ? 'flag.X1.many' : 'flag.X1.one', { n: fw.length }), lvl: 'warn',
      // B7: "Mother (Mother)" is written once when only the relation is known.
      factors: fw.map((r) => tx(r.who ? (r.onset ? 'flag.X1.lineWhoAt' : 'flag.X1.lineWho') : (r.onset ? 'flag.X1.lineAt' : 'flag.X1.line'), { rel: r.relLabel, who: r.who, cond: lc(r.cond), onset: r.onset, effect: r.effectText })),
      src: tx('flag.X1.src'), cert: tx('flag.X1.cert'),
    })
  }
  if (GENOMIC[k] && opts.genomic) out.push({ rule: 'P1', title: tx(`genomic.${k}.title`), lvl: 'warn', factors: [tx(`genomic.${k}.effect`)], src: tx(`genomic.${k}.source`), cert: tx('flag.genomicCert'), gen: true })
  out.push({
    rule: 'T2', title: tx('flag.T2.title'), lvl: 'muted',
    factors: [tx(`people.${k}.ctx`), tx('flag.T2.lives', { home: tx(`people.${k}.home`), nat: tx(`people.${k}.nat`), lang: tx(`people.${k}.lang`) })],
    src: tx('flag.T2.src'), cert: tx('flag.T2.cert'),
  })
  return out
}
/** Flags that are reasons to act (bad or warn), most important first (they are already in that order). */
export const topFlags = (flags: Flag[]): Flag[] => flags.filter((x) => x.lvl === 'bad' || x.lvl === 'warn')
export const joinedTitles = (flags: Flag[], n: number) => list(flags.slice(0, n).map((x) => lc(x.title)), '; ')
