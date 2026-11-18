import { FC_CUTS, FRAM, FRAM_AGE, HEART_AGE_REF, MGDL } from '../data/forecast'
import { tx, type FamilyProfile, type Txt } from '../data/types'

/**
 * Noa Forecast: Framingham 10-year heart and stroke risk, heart age and a 5-year what-if (pure functions, ported from the prototype).
 * A demo: Framingham was developed in a US population and needs local calibration before clinical use in the UAE; the 5-year
 * lines apply the person's own trends to today's score and are not a validated forecast.
 */

/** What the score needs. `tc` / `hdl` in mmol/L; both present = lab variant, otherwise the BMI variant. Trends are per year. */
export interface RiskInputs {
  age: number; sex: 'M' | 'F'; sbp: number; bpTx: boolean; smoker: boolean; dm: boolean
  tc: number | null; hdl: number | null; bmi: number; sbpTrend?: number; bmiTrend?: number
}

/** 10-year risk as a fraction (0..0.99). The lab variant when total and HDL cholesterol are both known, else the BMI variant. */
export function framRisk(p: RiskInputs): number {
  const lab = p.tc != null && p.hdl != null
  const c = FRAM[lab ? 'lab' : 'bmi'][p.sex === 'F' ? 'F' : 'M']
  const L = Math.log
  let s = c.age * L(p.age) + (p.bpTx ? c.sbpT : c.sbp) * L(p.sbp) + (p.smoker ? c.smk : 0) + (p.dm ? c.dm : 0)
  if (lab) { const l = c as typeof FRAM.lab.M; s += l.tc * L((p.tc as number) * MGDL) + l.hdl * L((p.hdl as number) * MGDL) } else s += (c as typeof FRAM.bmi.M).bmi * L(p.bmi)
  return Math.min(0.99, 1 - Math.pow(c.s0, Math.exp(s - c.mean)))
}

/** The age at which a reference person (sbp 125 untreated, no smoking, no diabetes, normal cholesterol, BMI 22.5) has this risk. */
export type HeartAge = number | 'atMost30' | 'over100'
export function heartAge(p: RiskInputs, r: number): HeartAge {
  const lab = p.tc != null && p.hdl != null, R = HEART_AGE_REF
  const norm = (a: number) => framRisk({ age: a, sex: p.sex, sbp: R.sbp, bpTx: false, smoker: false, dm: false, tc: lab ? R.tcMgdl / MGDL : null, hdl: lab ? R.hdlMgdl / MGDL : null, bmi: R.bmi })
  if (r <= norm(R.from)) return 'atMost30'
  if (r >= norm(R.to)) return 'over100'
  let lo: number = R.from, hi: number = R.to
  for (let i = 0; i < R.iterations; i++) { const m = (lo + hi) / 2; if (norm(m) < r) lo = m; else hi = m }
  return Math.round(lo)
}

/** Risk category: 20% or more high (red), 10% or more moderate (amber), else low (green). `cls` is the prototype's bad / warn / good. */
export interface RiskCat { id: 'high' | 'mid' | 'low'; tone: 'red' | 'amber' | 'green'; cls: 'bad' | 'warn' | 'good'; label: Txt; lower: Txt }
export function fcCat(r: number): RiskCat {
  const id = r >= FC_CUTS.high ? 'high' : r >= FC_CUTS.mid ? 'mid' : 'low'
  return { id, tone: id === 'high' ? 'red' : id === 'mid' ? 'amber' : 'green', cls: id === 'high' ? 'bad' : id === 'mid' ? 'warn' : 'good', label: tx(`forecast.cat.${id}`), lower: tx(`forecast.catLower.${id}`) }
}
/** "12%", or "<1%" below one percent (prototype pct). */
export const pct = (r: number): string => `${r * 100 < 1 ? '<1' : Math.round(r * 100)}%`

/**
 * What-if: today's score recalculated `yrs` years on. Without `plan` the person's own trends continue (sbp and BMI keep moving);
 * with `plan` blood pressure falls toward 120 (up to 10 mmHg in a year), BMI toward 25 (up to 2), smoking stops and total cholesterol
 * drops 0.8 mmol/L when above 5.
 */
export function fcProject(p: RiskInputs, yrs: number, plan: boolean): number {
  const q = { ...p }
  q.age = p.age + yrs
  q.sbp = Math.max(95, p.sbp + (plan ? Math.min(0, p.sbpTrend || 0) * yrs - Math.min(10, Math.max(0, p.sbp - 120)) * Math.min(1, yrs) : (p.sbpTrend || 0) * yrs))
  q.bmi = Math.max(18, p.bmi + (plan ? -Math.min(2, Math.max(0, p.bmi - 25)) * Math.min(1, yrs) : (p.bmiTrend || 0) * yrs))
  if (plan && yrs > 0) q.smoker = false
  if (plan && q.tc != null && yrs > 0) q.tc = Math.max(4, q.tc - (q.tc > 5 ? 0.8 : 0) * Math.min(1, yrs))
  return framRisk(q)
}

/** Why a score is not computed. */
export type NotScoredReason = 'child' | 'cvd' | 'under30' | 'over74'
/** The inputs the score used and the ones it is missing (`bmi` stands in for cholesterol when cholesterol is not measured). */
export type EvidenceId = 'age' | 'sex' | 'sbp' | 'bpTx' | 'smoker' | 'dm' | 'tc' | 'hdl' | 'bmi'
export interface Evidence {
  variant: 'lab' | 'bmi'
  used: { id: EvidenceId; value: number | string | boolean }[]
  missing: { id: EvidenceId }[]
  /** "BMI used because cholesterol is not measured yet" (BMI variant) or "Cholesterol used" (lab variant). */
  note: Txt
  /** The trends the 5-year lines use (per year). */
  trends: { sbp: number; bmi: number }
}
/** Everything needed to draw the 5-year chart. Series start at year 0 ("now"); values are fractions (0.18 = 18%). */
export interface ForecastChart {
  years: number[]
  /** Top of the y axis: at least 0.3, rounded up to 0.1 above the highest "trend" value. */
  max: number
  /** Gridline values (0, 0.1 ... up to `max`). */
  ticks: number[]
  /** Background bands: low 0 to 0.1, moderate 0.1 to 0.2, high 0.2 up to `max` (only when max is above 0.2). */
  bands: { id: 'low' | 'mid' | 'high'; from: number; to: number }[]
  /** Today's score (the dot). */
  now: number
  /** "If today's trends continue". */
  trend: number[]
  /** "With the plan". */
  plan: number[]
}
export interface ForecastNo { ok: false; reason: NotScoredReason; why: Txt; short: Txt }
export interface ForecastYes {
  ok: true
  /** 10-year risk now. */
  r: number
  cat: RiskCat
  lab: boolean
  ha: HeartAge
  /** 5 years on if trends continue, and with the plan. */
  r5: number
  p5: number
  cat5: RiskCat
  /** [trend, plan] for each of years 0..5. */
  traj: [number, number][]
  chart: ForecastChart
  evidence: Evidence
}
export type ForecastResult = ForecastNo | ForecastYes

/** The score applies to people aged 30 to 74 without a heart attack or stroke. `reason` says why not. */
export function fcValidity(p: FamilyProfile | null | undefined): NotScoredReason | null {
  if (!p || p.child) return 'child'
  if (p.cvd) return 'cvd'
  if (p.age < FRAM_AGE.min) return 'under30'
  if (p.age > FRAM_AGE.max) return 'over74'
  return null
}

const no = (reason: NotScoredReason): ForecastNo => ({ ok: false, reason, why: tx(`forecast.na.${reason}`), short: tx(`forecast.naShort.${reason}`) })

function chartOf(traj: [number, number][], r: number): ForecastChart {
  const max = Math.max(0.3, Math.ceil(Math.max(...traj.map((t) => t[0])) * 10) / 10)
  const ticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].filter((v) => v <= max + 1e-9)
  const bands: ForecastChart['bands'] = [{ id: 'low', from: 0, to: 0.1 }, { id: 'mid', from: 0.1, to: 0.2 }]
  if (max > 0.2) bands.push({ id: 'high', from: 0.2, to: max })
  return { years: [0, 1, 2, 3, 4, 5], max, ticks, bands, now: r, trend: traj.map((t) => t[0]), plan: traj.map((t) => t[1]) }
}

/** The forecast of one family profile: the score, heart age, 5-year what-if and evidence, or why it does not apply. */
export function fcFor(p: FamilyProfile | null | undefined): ForecastResult {
  const why = fcValidity(p)
  if (why || !p || p.child) return no(why ?? 'child')
  const r = framRisk(p), r5 = fcProject(p, 5, false), p5 = fcProject(p, 5, true)
  const lab = p.tc != null && p.hdl != null
  const traj = [0, 1, 2, 3, 4, 5].map((y): [number, number] => [fcProject(p, y, false), fcProject(p, y, true)])
  const base: Evidence['used'] = [{ id: 'age', value: p.age }, { id: 'sex', value: p.sex }, { id: 'sbp', value: p.sbp }, { id: 'bpTx', value: p.bpTx }, { id: 'smoker', value: p.smoker }, { id: 'dm', value: p.dm }]
  const evidence: Evidence = lab
    ? { variant: 'lab', used: [...base, { id: 'tc', value: p.tc as number }, { id: 'hdl', value: p.hdl as number }], missing: [], note: tx('forecast.evidence.lab'), trends: { sbp: p.sbpTrend, bmi: p.bmiTrend } }
    : { variant: 'bmi', used: [...base, { id: 'bmi', value: p.bmi }], missing: [{ id: 'tc' }, { id: 'hdl' }], note: tx('forecast.evidence.bmiUsed'), trends: { sbp: p.sbpTrend, bmi: p.bmiTrend } }
  return { ok: true, r, cat: fcCat(r), lab, ha: heartAge(p, r), r5, p5, cat5: fcCat(r5), traj, chart: chartOf(traj, r), evidence }
}

/** Next well-child visit age in months for a child profile, or null when all 14 are done (prototype wcNext; `ages` = WC_AGES). */
export const wcNext = (p: { ageM: number }, ages: readonly number[]): number | null => ages.find((x) => x >= p.ageM) ?? null
/** Visits done out of 14 (prototype wcDone). */
export const wcDone = (p: { ageM: number; overdueW: number }, ages: readonly number[]): number => ages.filter((x) => x < p.ageM).length + (p.overdueW === 0 && ages.includes(p.ageM) ? 1 : 0)
/** IFHAS screening applies to Emirati adults aged 18 to 75 (prototype ifhasOk). */
export const ifhasOk = (p: FamilyProfile): boolean => !p.child && p.emirati && p.age >= 18 && p.age <= 75

/**
 * The forecast shown next to the HbA1c result in the IFHAS case: fixed demo values for sex, blood pressure, smoking and cholesterol,
 * the case's age, and diabetes switched on from HbA1c 6.5 (`null` when the age is outside 30 to 74).
 */
export function ifhasForecast(age: number, hba1c: number, ref: { sex: 'M' | 'F'; sbp: number; bpTx: boolean; smoker: boolean; tc: number; hdl: number; bmi: number; sbpTrend: number; bmiTrend: number; hba1cDm: number }): { f: ForecastResult; dm: boolean } {
  const dm = hba1c >= ref.hba1cDm
  const p: FamilyProfile = { age, sex: ref.sex, sbp: ref.sbp, bpTx: ref.bpTx, smoker: ref.smoker, dm, tc: ref.tc, hdl: ref.hdl, bmi: ref.bmi, cvd: false, sbpTrend: ref.sbpTrend, bmiTrend: ref.bmiTrend, emirati: true }
  return { f: fcFor(p), dm }
}
