import { FAMILY_RANGES, PREV_RANGES, SAFETY_RANGES } from '../data/forecast'
import { PEOPLE } from '../data/people'
import { tx, type AdultProfile, type FamilyProfile, type PersonId, type PrevInputs, type SafetyInputs, type Txt } from '../data/types'
import { fcValidity } from './forecast'

/**
 * Input guardrail (plan item B3). Every number a person can type in the Test case has a plausible range, taken from the prototype's own
 * sliders (see `data/forecast.ts`: FAMILY_RANGES, SAFETY_RANGES, PREV_RANGES); there are no clinical thresholds here, only
 * "could this be a real reading". Two levels:
 *  - `required`: the decision cannot be taken on this input. The UI must ask again. The engine refuses `play()` / `checkPassport()`
 *    while a required issue of the case is open.
 *  - `recommended`: a warning only; the flow continues (for example cholesterol not measured, so the BMI score is used).
 * The engine reports them on `snapshot.inputIssues`.
 */
export type IssueLevel = 'required' | 'recommended'
export type IssueKind = 'missing' | 'range'
export interface InputIssue {
  /** `own` / the case id for the safety and prevention inputs, the member id for a family profile or result. */
  subject: string
  field: string
  level: IssueLevel
  kind: IssueKind
  /** Explanation to show next to the field. */
  message: Txt
  min?: number
  max?: number
  /** What was entered (null when missing). */
  value?: number | null
  /** The value the engine kept or used instead (clamped value for family profiles, the previous valid value otherwise). */
  applied?: number
}
export interface InputIssues { required: InputIssue[]; recommended: InputIssue[] }
export const noIssues = (): InputIssues => ({ required: [], recommended: [] })
export const noteKey = (subject: string, field: string): string => `${subject}.${field}`

export interface Range { min: number; max: number; step: number }
export interface Checked { ok: boolean; kind?: IssueKind; /** The raw value snapped to the step, or clamped to the range. */ value: number }
const decimals = (step: number): number => (String(step).split('.')[1] ?? '').length
/** Snap to the step (counted from the minimum) like a range input does, without float noise (0.30000000000000004). */
export const snap = (v: number, r: Range): number => +(r.min + Math.round((v - r.min) / r.step) * r.step).toFixed(decimals(r.step))

/** Check one raw value: not a number = missing; outside the range = out of range (the value is clamped); else snapped to the step. */
export function checkValue(r: Range, raw: unknown): Checked {
  if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean') return { ok: false, kind: 'missing', value: NaN }
  const n = Number(raw)
  if (!Number.isFinite(n)) return { ok: false, kind: 'missing', value: NaN }
  if (n < r.min) return { ok: false, kind: 'range', value: r.min }
  if (n > r.max) return { ok: false, kind: 'range', value: r.max }
  return { ok: true, value: snap(n, r) }
}

const familyLabel = (f: string): Txt => tx(`family.pfl.${f}`)
const inputLabel = (f: string): Txt => tx(`inputs.field.${f}`)

/**
 * An issue for a value that was refused (`reject`: the previous valid value stays; required) or clamped (`clamp`: family profiles, as the
 * prototype's sliders do; a warning only).
 */
export function issueFor(subject: string, field: string, label: Txt, r: Range, raw: unknown, c: Checked, policy: 'reject' | 'clamp', kept: number | undefined): InputIssue {
  const level: IssueLevel = policy === 'reject' ? 'required' : 'recommended'
  if (c.kind === 'missing') {
    return { subject, field, level: 'required', kind: 'missing', message: tx('inputs.missing', { label }), value: null, applied: kept }
  }
  const applied = policy === 'clamp' ? c.value : kept
  return {
    subject, field, level, kind: 'range', value: Number(raw), min: r.min, max: r.max, applied,
    message: tx(policy === 'clamp' ? 'inputs.clamped' : 'inputs.rejected', { label, value: Number(raw), min: r.min, max: r.max, applied }),
  }
}
export const familyIssue = (member: string, field: keyof typeof FAMILY_RANGES, raw: unknown, c: Checked, kept: number | undefined) =>
  issueFor(member, field, familyLabel(field), FAMILY_RANGES[field], raw, c, 'clamp', kept)
export const safetyIssue = (field: keyof typeof SAFETY_RANGES, raw: unknown, c: Checked, kept: number | undefined) =>
  issueFor('safety', field, inputLabel(field), SAFETY_RANGES[field], raw, c, 'reject', kept)
export const prevRange = (field: 'age' | 'overdue' | 'rem', kind: 'child' | 'adult'): Range => (field === 'age' ? PREV_RANGES[kind === 'child' ? 'ageChild' : 'ageAdult'] : PREV_RANGES[field])
export const prevIssue = (field: 'age' | 'overdue' | 'rem', kind: 'child' | 'adult', raw: unknown, c: Checked, kept: number | undefined) =>
  issueFor('prevention', field, inputLabel(field), prevRange(field, kind), raw, c, 'reject', kept)

const outOfRange = (subject: string, field: string, label: Txt, r: Range, v: number): InputIssue =>
  ({ subject, field, level: 'required', kind: 'range', value: v, min: r.min, max: r.max, message: tx('inputs.outOfRange', { label, value: v, min: r.min, max: r.max }) })

/** Issues in the current safety inputs (state scan): values outside the plausible range, a glucose sensor that is off for a person with diabetes. */
export function safetyStateIssues(I: SafetyInputs, person: PersonId): InputIssue[] {
  const out: InputIssue[] = []
  for (const f of Object.keys(SAFETY_RANGES) as (keyof typeof SAFETY_RANGES)[]) {
    const v = I[f]
    if (f === 'glu' && v == null) continue
    if (f === 'floor' && !I.fall) continue
    if (typeof v !== 'number' || !Number.isFinite(v)) out.push({ subject: 'safety', field: f, level: 'required', kind: 'missing', message: tx('inputs.missing', { label: inputLabel(f) }), value: null })
    else if (v < SAFETY_RANGES[f].min || v > SAFETY_RANGES[f].max) out.push(outOfRange('safety', f, inputLabel(f), SAFETY_RANGES[f], v))
  }
  const p = PEOPLE[person]
  if (I.glu == null && (p.dm || p.cgm)) out.push({ subject: 'safety', field: 'glu', level: 'recommended', kind: 'missing', message: tx('inputs.rec.glucose'), value: null })
  return out
}

export function prevStateIssues(I: PrevInputs, kind: 'child' | 'adult'): InputIssue[] {
  const out: InputIssue[] = []
  for (const f of ['age', 'overdue', 'rem'] as const) {
    const r = prevRange(f, kind), v = I[f]
    if (typeof v !== 'number' || !Number.isFinite(v)) out.push({ subject: 'prevention', field: f, level: 'required', kind: 'missing', message: tx('inputs.missing', { label: inputLabel(f) }), value: null })
    else if (v < r.min || v > r.max) out.push(outOfRange('prevention', f, inputLabel(f), r, v))
  }
  return out
}

/** Issues in one family profile (state scan). Adults only; a child has two numbers, both ranges. */
export function profileStateIssues(member: string, p: FamilyProfile): InputIssue[] {
  const out: InputIssue[] = []
  const scan = (fields: readonly (keyof typeof FAMILY_RANGES)[], get: (f: string) => unknown) => {
    for (const f of fields) {
      const v = get(f)
      if (v == null) continue
      if (typeof v !== 'number' || !Number.isFinite(v)) out.push({ subject: member, field: f, level: 'required', kind: 'missing', message: tx('inputs.missing', { label: familyLabel(f) }), value: null })
      else if (v < FAMILY_RANGES[f].min || v > FAMILY_RANGES[f].max) out.push(outOfRange(member, f, familyLabel(f), FAMILY_RANGES[f], v))
    }
  }
  if (p.child) { scan(['ageM', 'overdueW'], (f) => (p as unknown as Record<string, unknown>)[f]); return out }
  const a: AdultProfile = p
  scan(['age', 'sbp', 'bmi', 'tc', 'hdl', 'sbpTrend', 'bmiTrend'], (f) => (a as unknown as Record<string, unknown>)[f])
  // The score is computed for ages 30 to 74 without a heart attack or stroke; for them, missing cholesterol is worth a warning.
  if (fcValidity(a) === null) {
    if (a.tc == null && a.hdl == null) out.push({ subject: member, field: 'tc', level: 'recommended', kind: 'missing', message: tx('inputs.rec.cholesterol'), value: null })
    else if (a.tc == null || a.hdl == null) out.push({ subject: member, field: a.tc == null ? 'tc' : 'hdl', level: 'recommended', kind: 'missing', message: tx('inputs.rec.cholesterolPair'), value: null })
  }
  return out
}

export function split(issues: InputIssue[]): InputIssues {
  return { required: issues.filter((i) => i.level === 'required'), recommended: issues.filter((i) => i.level === 'recommended') }
}
