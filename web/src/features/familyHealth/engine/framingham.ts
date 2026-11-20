import { framRisk, heartAge, type RiskInputs } from '@/features/testcase/engine/forecast'
import type { AdultProfile, Profile } from '../data/types'
import { RISK } from '../data/thresholds'

/**
 * Noa Forecast for the family panel: Framingham 10-year heart and stroke risk (D'Agostino 2008), reusing the Test case engine's
 * `framRisk` and `heartAge` (same coefficients as the prototype). The 5-year what-if is the prototype's own `project`.
 */
export type RiskCat = 'high' | 'moderate' | 'low'
export type NotScored = 'child' | 'cvd' | 'under30' | 'over74'
export type Forecast =
  | { ok: false; why: NotScored }
  | { ok: true; r: number; cat: RiskCat; heartAge: number | 'atMost30' | 'over100'; r5: number; p5: number; lab: boolean }

const inputs = (p: AdultProfile): RiskInputs => ({ age: p.age, sex: p.sex, sbp: p.sbp, bpTx: p.bpTx, smoker: p.smoker, dm: p.dm, tc: p.tc, hdl: p.hdl, bmi: p.bmi, sbpTrend: p.sbpTrend, bmiTrend: p.bmiTrend })

export const riskCat = (r: number): RiskCat => (r >= RISK.high ? 'high' : r >= RISK.mid ? 'moderate' : 'low')
export const riskTone = (c: RiskCat): 'bad' | 'warn' | 'good' => (c === 'high' ? 'bad' : c === 'moderate' ? 'warn' : 'good')
/** "44%", or "<1%" below one percent (prototype pct). */
export const pct = (r: number): string => `${r * 100 < 1 ? '<1' : Math.round(r * 100)}%`

/** The score `y` years on: own trends continue, or with the plan (BP toward 120, BMI toward 25, no smoking, cholesterol down). */
export function project(p: AdultProfile, y: number, plan: boolean): number {
  const q = inputs(p)
  q.age = p.age + y
  q.sbp = Math.max(95, p.sbp + (plan ? -Math.min(10, Math.max(0, p.sbp - 120)) * Math.min(1, y) : (p.sbpTrend || 0) * y))
  q.bmi = Math.max(18, p.bmi + (plan ? -Math.min(2, Math.max(0, p.bmi - 25)) * Math.min(1, y) : (p.bmiTrend || 0) * y))
  if (plan && y > 0) q.smoker = false
  if (plan && q.tc != null && y > 0) q.tc = Math.max(4, q.tc - (q.tc > 5 ? 0.8 : 0) * Math.min(1, y))
  return framRisk(q)
}

/** The forecast of one profile, or why it is not scored (children, after a heart attack or stroke, outside ages 30 to 74). */
export function forecast(p: Profile): Forecast {
  if (p.child) return { ok: false, why: 'child' }
  if (p.cvd) return { ok: false, why: 'cvd' }
  if (p.age < RISK.ageMin) return { ok: false, why: 'under30' }
  if (p.age > RISK.ageMax) return { ok: false, why: 'over74' }
  const r = framRisk(inputs(p))
  return { ok: true, r, cat: riskCat(r), heartAge: heartAge(inputs(p), r), r5: project(p, 5, false), p5: project(p, 5, true), lab: p.tc != null && p.hdl != null }
}

/** CHA2DS2-VASc-like points used by the prototype for stroke risk (kept for the record view). */
export const chads = (p: AdultProfile): number => (p.age >= 75 ? 2 : p.age >= 65 ? 1 : 0) + (p.sex === 'F' ? 1 : 0) + (p.bpTx || p.sbp >= 140 ? 1 : 0) + (p.dm ? 1 : 0) + (p.cvd ? 2 : 0)
