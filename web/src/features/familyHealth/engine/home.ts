import { DIN_ROUNDS, QDEFAULTS, QSCORE, QSET_ITEMS, SELECT, type QVals } from '../data/tests'
import type { AdultProfile, PersonId, QsetId, Txt, VtId } from '../data/types'
import { famHas, type FamRow, type Signal } from './flags'
import { list, tx } from './text'

/**
 * Home screening by voice: which tests Noa chooses for the person and why (prototype selectTests), the questionnaire items with
 * their record-filled answers (QS), scoring (scoreQ) and the digits-in-noise hearing check.
 */
export interface TestChoice { id: VtId; why: Txt }
export interface TestPlan { use: TestChoice[]; skip: TestChoice[] }

export function selectTests(k: PersonId, p: AdultProfile, urgent: Signal | null, fam: FamRow[]): TestPlan {
  const trig = !!(urgent && /^(G|L1)/.test(urgent.rule)), spk = !!(urgent && urgent.rule.startsWith('G'))
  const use: TestChoice[] = [], skip: TestChoice[] = [], dmFam = famHas(fam, 'dm')
  if (spk && urgent) use.push({ id: 'speech', why: tx('vt.why.speech', { signal: urgent.text }) })
  else skip.push({ id: 'speech', why: tx('vt.skip.speech') })
  if (p.age >= SELECT.dinFrom && !trig) use.push({ id: 'din', why: tx('vt.why.age', { age: p.age }) })
  else skip.push({ id: 'din', why: tx(trig ? 'vt.skip.safety' : 'vt.skip.from60') })
  if (p.age >= SELECT.fallsFrom && !(urgent && urgent.rule === 'L1')) use.push({ id: 'falls', why: tx(famHas(fam, 'bone') ? 'vt.why.ageBone' : 'vt.why.age', { age: p.age }) })
  else skip.push({ id: 'falls', why: tx('vt.skip.from60') })
  if (!p.dm && (p.gdm || dmFam || p.bmi >= SELECT.dmBmi) && !trig) {
    const reasons: Txt[] = []
    if (p.gdm) reasons.push(tx('vt.why.gdm'))
    if (dmFam) reasons.push(tx('vt.why.dmParent'))
    if (p.bmi >= SELECT.dmBmi) reasons.push(tx('vt.why.bmi', { bmi: p.bmi }))
    use.push({ id: 'dmrisk', why: tx('vt.why.list', { list: list(reasons, ', ') }) })
  } else skip.push({ id: 'dmrisk', why: tx(p.dm ? 'vt.skip.hasDm' : trig ? 'vt.skip.safety' : 'vt.skip.noRisk') })
  if (p.sex === 'M' && p.age >= SELECT.stopbangAge && (p.bmi >= SELECT.stopbangBmi || p.sbp >= SELECT.stopbangSbp) && !trig) use.push({ id: 'stopbang', why: tx('vt.why.stopbang', { bmi: p.bmi, sbp: p.sbp, dbp: p.dbp }) })
  else skip.push({ id: 'stopbang', why: tx(trig ? 'vt.skip.safety' : 'vt.skip.profile') })
  if (!trig) use.push({ id: 'phq2', why: tx('vt.why.phq2') })
  else skip.push({ id: 'phq2', why: tx('vt.skip.phq2') })
  return { use, skip }
}

/** A questionnaire line as shown on the card: `auto` lines carry the value read from the record (points or yes/no). */
export interface QItem { id: string; kind: 'yn' | 'phq' | 'auto'; label: Txt; auto?: number | boolean }

export function qsetItems(id: QsetId, p: AdultProfile, fam: FamRow[]): QItem[] {
  const autoVal: Record<string, number | boolean> = id === 'stopbang'
    ? { P: !!p.bpTx, B: p.bmi > QSCORE.stopbangBmi, A: p.age > QSCORE.stopbangAge, G: p.sex === 'M' }
    : id === 'dmrisk'
      ? { age: p.age >= 60 ? 3 : p.age >= 50 ? 2 : p.age >= 40 ? 1 : 0, sex: p.sex === 'M' ? 1 : 0, gdm: p.gdm ? 1 : 0, fam: famHas(fam, 'dm') ? 1 : 0, hbp: p.bpTx ? 1 : 0, bmi: p.bmi >= 40 ? 3 : p.bmi >= 30 ? 2 : p.bmi >= 25 ? 1 : 0 }
      : {}
  return QSET_ITEMS[id].map((i) => ({
    id: i.id, kind: i.kind,
    label: tx(`qs.${id}.${i.id}`, { age: p.age, bmi: p.bmi }),
    ...(i.kind === 'auto' ? { auto: autoVal[i.id] } : {}),
  }))
}

/** Default answers: the person's own (prototype QDEF), then the test case's. */
export function qsetDefaults(k: PersonId, id: QsetId, tcVals?: QVals): QVals {
  return { ...((QDEFAULTS[k] ?? {})[id] ?? {}), ...(tcVals ?? {}) }
}

export interface QResult { score: number; txt: Txt; lvl: 'good' | 'warn' | 'bad' }
export function scoreQ(id: QsetId, items: QItem[], v: QVals): QResult {
  if (id === 'falls') {
    const n = items.filter((i) => v[i.id]).length
    return { score: n, txt: n ? tx('qs.result.fallsRisk', { n }) : tx('qs.result.fallsLow'), lvl: n ? 'warn' : 'good' }
  }
  if (id === 'phq2') {
    const n = (Number(v.int) || 0) + (Number(v.down) || 0)
    return { score: n, txt: tx(n >= QSCORE.phq2Positive ? 'qs.result.phqPos' : 'qs.result.phqNeg', { n }), lvl: n >= QSCORE.phq2Positive ? 'warn' : 'good' }
  }
  if (id === 'stopbang') {
    const n = items.filter((i) => (i.kind === 'auto' ? i.auto : v[i.id])).length
    const band = n >= QSCORE.stopbangHigh ? 'high' : n >= QSCORE.stopbangMid ? 'mid' : 'low'
    return { score: n, txt: tx(`qs.result.sb.${band}`, { n }), lvl: band === 'high' ? 'bad' : band === 'mid' ? 'warn' : 'good' }
  }
  const n = items.reduce((a, i) => a + (i.kind === 'auto' ? Number(i.auto) || 0 : i.id === 'act' ? (v.act ? 0 : 1) : 0), 0)
  return { score: n, txt: tx(n >= QSCORE.dmriskHigh ? 'qs.result.dmHigh' : 'qs.result.dmLow', { n }), lvl: n >= QSCORE.dmriskHigh ? 'warn' : 'good' }
}

/** Digits in noise: the answers pre-filled for the demo (a wrong round keeps the first two digits and shifts the last by 3). */
export function dinDefaults(k: PersonId, tcDin?: boolean[]): string[] {
  const d = tcDin ?? QDEFAULTS[k]?.din ?? [true, true, true]
  return DIN_ROUNDS.map((r, i) => { const s = r.digits.replace(/ /g, ''); return d[i] ? s : s.slice(0, 2) + ((Number(s.slice(-1)) + 3) % 10) })
}
export interface DinResult { ok: boolean[]; n: number; refer: boolean; txt: Txt; lvl: 'good' | 'warn' }
export function scoreDin(answers: readonly string[]): DinResult {
  const ok = DIN_ROUNDS.map((r, i) => String(answers[i] ?? '').replace(/\D/g, '') === r.digits.replace(/ /g, ''))
  const n = ok.filter(Boolean).length, refer = n < DIN_ROUNDS.length
  return { ok, n, refer, txt: tx(refer ? 'din.result.refer' : 'din.result.pass', { n }), lvl: refer ? 'warn' : 'good' }
}
