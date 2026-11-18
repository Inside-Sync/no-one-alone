import { PEOPLE } from '../data/people'
import { CASES } from '../data/cases'
import { PREVENTION_STEPS, PV, WC_AGES } from '../data/prevention'
import { STEP_ZERO } from '../data/stepZero'
import { tx, type PersonId, type PvId, type StepDef, type Txt } from '../data/types'
import type { PrevInputs, Route, State } from './types'

/** The visit name for an age in months: "8-month visit", "2-year visit", "2.5-year visit". */
export function wcName(m: number): Txt {
  if (m < 24) return tx('prevention.wcMonth', { m })
  return m % 12 ? tx('prevention.wcYear', { y: (m / 12).toFixed(1) }) : tx('prevention.wcYear', { y: m / 12 })
}

/** The IFHAS check groups due for an adult (prototype ifhasItems; a small demo subset of the 50+ tests). */
export function ifhasItems(age: number, sex: 'F' | 'M'): Txt[] {
  const g: Txt[] = []
  if (age >= 18) g.push(tx('prevention.ifhas.metabolic'), tx('prevention.ifhas.heart'))
  if (age >= 45) g.push(tx('prevention.ifhas.bowel'))
  if (sex === 'F' && age >= 40) g.push(tx('prevention.ifhas.breast'))
  if (sex === 'F' && age >= 25 && age <= 65) g.push(tx('prevention.ifhas.cervical'))
  if ((sex === 'F' && age >= 50) || (sex === 'M' && age >= 70)) g.push(tx('prevention.ifhas.bone'))
  if (age >= 65) g.push(tx('prevention.ifhas.memory'))
  return g
}

export type DueResult = { ok: true; item: Txt; list: Txt[] } | { ok: false; why: Txt }

/** Is anything due, for this person and these inputs (prototype dueNow). Eligibility first: age, nationality, life stage. */
export function dueNow(pv: PvId, I: PrevInputs, person: PersonId): DueResult {
  const c = PV[pv]
  if (c.kind === 'child') {
    if (I.age > 72) return { ok: false, why: tx('prevention.why.tooOld') }
    if (I.age < 1) return { ok: false, why: tx('prevention.why.tooYoung') }
    const v = WC_AGES.filter((a) => a <= I.age).pop() as number
    return { ok: true, item: tx('prevention.itemChild', { visit: wcName(v), i: WC_AGES.indexOf(v) + 1 }), list: [tx('prevention.listChild', { visit: wcName(v) })] }
  }
  if (I.nat !== 'Emirati') return { ok: false, why: tx('prevention.why.notEmirati') }
  if (I.age < 18 || I.age > 75) return { ok: false, why: tx('prevention.why.outsideAge') }
  const l = ifhasItems(I.age, PEOPLE[person].sex)
  return { ok: true, item: tx('prevention.itemAdult', { count: l.length }), list: l }
}

const route = (pv: PvId, name: string, b: 'refer' | 'ok', teach: Route['teach'], team = false, next = false): Route => ({
  b,
  t: tx(`prevention.route.${pv}.${name}.t`),
  tCap: tx(`prevention.route.${pv}.${name}.tcap`),
  team: team ? tx(`prevention.route.${pv}.${name}.team`) : null,
  next: next ? tx(`prevention.route.${pv}.${name}.next`) : null,
  teach,
})

/**
 * Where a result goes (rule P9): outside the healthy range -> the right team within 2 weeks (`refer`), otherwise the passport (`ok`).
 * Thresholds are the prototype's demo thresholds (not clinical guidance).
 */
export function routeResult(pv: PvId, v: number): Route {
  switch (pv) {
    case 'wellchild': // fewer than 3 words besides mama and dada at 18 months
      return v < 3 ? route(pv, 'refer', 'refer', 'child_speech', true) : route(pv, 'ok', 'ok', 'prev_ok', false, true)
    case 'ifhas': // HbA1c: 6.5 and over diabetes range, 5.7 to 6.4 prediabetes
      return v >= 6.5 ? route(pv, 'dm', 'refer', 'dm', true) : v >= 5.7 ? route(pv, 'pre', 'refer', 'prev_ref', true) : route(pv, 'ok', 'ok', 'prev_ok', false, true)
    case 'expat': // weight-for-age centile below 2nd or above 98th
      return v < 2 || v > 98 ? route(pv, 'refer', 'refer', 'prev_ref', true) : route(pv, 'ok', 'ok', 'prev_ok', false, true)
    case 'bone': // T-score: -2.5 or lower osteoporosis, between -1 and -2.5 low bone density
      return v <= -2.5 ? route(pv, 'osteo', 'refer', 'bone', true) : v < -1 ? route(pv, 'low', 'refer', 'prev_ref', true) : route(pv, 'ok', 'ok', 'prev_ok', false, true)
  }
}

/** The journey after a barrier is chosen (prototype prevSteps): items of "The visit" and "Until it's done" come from the case. */
export function prevSteps(S: State): StepDef[] {
  const c = PV[CASES[S.ck].pv as PvId]
  return PREVENTION_STEPS.map((s, i) => {
    if (i === 1) return { ...s, items: c.visit }
    if (i === 3) return { ...s, text: S.branch === 'refer' ? s.text : s.textOk }
    if (i === 5) return { ...s, items: c.follow[S.branch ?? 'ok'] }
    return s
  })
}

/** Step 0 of the prevention cases; the Navigator joins the flow once a path is chosen. */
export function passportStep(S: State): StepDef {
  const s = STEP_ZERO.passport
  return S.dec?.path ? { ...s, flow: [...s.flow, { agent: 'navigator' }] } : s
}
