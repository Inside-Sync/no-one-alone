import { DEVICES, bmiOf } from '../data/people'
import type { AdultProfile, ChildProfile, PersonId, Profile, SignalRuleId, Txt, VtId } from '../data/types'
import { signalRules, urgentOf, type FamRow, type Signal } from './flags'
import { forecast, type Forecast } from './framingham'
import { selectTests } from './home'
import { tx } from './text'

/**
 * "Try it · <Name>'s readings" (prototype renderWhatIf / WDEF / WPRE / whatIfHTML): sliders with coloured zones, scenarios and a
 * live answer to "what would Noa do with these readings?". Pure: the UI renders it, the engine's profile edits change the values.
 */
export type Zone = 'good' | 'warn' | 'bad' | 'info'
export type WhatIfField = 'hr' | 'sbp' | 'dbp' | 'spo2' | 'glu' | 'irrAlerts' | 'wt' | 'age' | 'ageM' | 'overdueW'
/** A zone from `lo` (inclusive) to `hi` (exclusive). Texts `wi.zone.<field>.<i>`. */
export interface ZoneBand { lo: number; hi: number; zone: Zone }
export interface SliderDef { id: WhatIfField; min: number; max: number; step: number; zones: ZoneBand[] | null }

/** Zone colours of the prototype (track gradients and dots). */
export const ZONE_COLOR: Record<Zone, string> = { good: '#1fb39c', warn: '#e3a43c', bad: '#d9534f', info: '#b9c3d6' }

const Z = (lo: number, hi: number, zone: Zone): ZoneBand => ({ lo, hi, zone })
/** Well-child visits (months) and their names: "18-month visit", "5-year visit". */
export const WELL_CHILD = [1, 2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48, 60, 72] as const
export const wellChildName = (m: number): Txt => (m < 24 ? tx('wi.visitM', { n: m }) : tx('wi.visitY', { n: m / 12 }))

const hasGlucose = (k: PersonId, p: AdultProfile) => !!p.dm || (DEVICES[k] ?? []).some((d) => d.value === 'glu')

/** The sliders of an adult, in the prototype order (glucose only with diabetes or a glucose sensor). */
export function whatIfFields(k: PersonId, p: AdultProfile): SliderDef[] {
  const h = (p.ht / 100) ** 2
  return [
    { id: 'hr', min: 30, max: 180, step: 1, zones: [Z(0, 40, 'bad'), Z(40, 100, 'good'), Z(100, 120, 'warn'), Z(120, 999, 'bad')] },
    { id: 'sbp', min: 80, max: 220, step: 1, zones: [Z(0, 90, 'warn'), Z(90, 140, 'good'), Z(140, 180, 'warn'), Z(180, 999, 'bad')] },
    { id: 'dbp', min: 40, max: 140, step: 1, zones: [Z(0, 90, 'good'), Z(90, 120, 'warn'), Z(120, 999, 'bad')] },
    { id: 'spo2', min: 80, max: 100, step: 1, zones: [Z(0, 92, 'bad'), Z(92, 95, 'warn'), Z(95, 999, 'good')] },
    ...(hasGlucose(k, p) ? [{ id: 'glu' as const, min: 2, max: 20, step: 0.1, zones: [Z(0, 3, 'bad'), Z(3, 3.9, 'warn'), Z(3.9, 10.01, 'good'), Z(10.01, 999, 'warn')] }] : []),
    { id: 'irrAlerts', min: 0, max: 10, step: 1, zones: [Z(0, 1, 'good'), Z(1, 999, 'warn')] },
    { id: 'wt', min: 40, max: 160, step: 0.5, zones: [Z(0, 18.5 * h, 'warn'), Z(18.5 * h, 25 * h, 'good'), Z(25 * h, 30 * h, 'warn'), Z(30 * h, 999, 'bad')] },
    { id: 'age', min: 18, max: 95, step: 1, zones: null },
  ]
}
/** The sliders of a child: age in months and how overdue the next visit is. */
export const CHILD_FIELDS: SliderDef[] = [
  { id: 'ageM', min: 1, max: 72, step: 1, zones: null },
  { id: 'overdueW', min: 0, max: 26, step: 1, zones: [Z(0, 1, 'good'), Z(1, 2, 'warn'), Z(2, 999, 'bad')] },
]

/** The zone of a value and its line under the slider ("Racing · Noa checks now", "BMI 29.7 · diabetes risk test"). */
export function zoneOf(def: SliderDef, v: number, p: Profile): { zone: Zone; text: Txt | null } {
  if (def.id === 'wt' && !p.child) {
    const b = bmiOf({ ...p, wt: v })
    const key = b >= 30 ? 'high' : b >= 25 ? 'over' : b < 18.5 ? 'under' : 'ok'
    return { zone: key === 'high' ? 'bad' : key === 'ok' ? 'good' : 'warn', text: tx(`wi.bmi.${key}`, { bmi: b }) }
  }
  if (def.id === 'age' && !p.child) {
    const e: Txt[] = []
    if (v >= 40 && v <= 75) e.push(tx('wi.age.bowel'))
    if (p.sex === 'F' && v >= 40 && v <= 69) e.push(tx('wi.age.mammo'))
    if (p.sex === 'F' && v >= 65) e.push(tx('wi.age.bone'))
    if (v > 75) e.push(tx('wi.age.ended'))
    return { zone: 'info', text: e.length ? tx('wi.age.due', { list: { list: e, sep: ', ' } }) : tx('wi.age.adult') }
  }
  if (def.id === 'ageM') {
    const nx = WELL_CHILD.find((a) => a >= v)
    return { zone: 'info', text: nx ? tx('wi.next', { visit: wellChildName(nx) }) : tx('wi.allDone') }
  }
  if (!def.zones) return { zone: 'info', text: null }
  const i = def.zones.findIndex((z) => v >= z.lo && v < z.hi)
  const at = i < 0 ? def.zones.length - 1 : i
  return { zone: def.zones[at].zone, text: tx(`wi.zone.${def.id}.${at}`) }
}

/** Gradient stops of a slider track: each zone's colour at the middle of its visible part (prototype trackBg). */
export function trackStops(def: SliderDef): { color: string; at: number }[] {
  if (!def.zones) return []
  const pc = (v: number) => Math.max(0, Math.min(100, ((v - def.min) / (def.max - def.min)) * 100))
  const st: { color: string; at: number }[] = []
  for (const z of def.zones) {
    const a = Math.max(z.lo, def.min), b = Math.min(z.hi, def.max)
    if (b <= a) continue
    st.push({ color: ZONE_COLOR[z.zone], at: Math.round(pc((a + b) / 2) * 10) / 10 })
  }
  if (st.length === 1) st.push(st[0])
  return st
}

/** Scenarios (prototype WPRE): a patch of readings; `normal` puts the readings back to the person's own. */
export const SCENARIO_IDS = ['race', 'slow', 'bp', 'o2', 'hypo', 'rhythm', 'normal'] as const
export type ScenarioId = (typeof SCENARIO_IDS)[number]
export const SCENARIOS: Record<ScenarioId, Partial<AdultProfile> | null> = {
  race: { hr: 128 }, slow: { hr: 36 }, bp: { sbp: 184, dbp: 112 }, o2: { spo2: 89 }, hypo: { glu: 2.7 }, rhythm: { irrAlerts: 3 }, normal: null,
}
/** The readings a "All normal" scenario puts back. */
export const SCENARIO_FIELDS = ['hr', 'sbp', 'dbp', 'spo2', 'irrAlerts', 'glu'] as const
/** The scenarios offered for a person ("Low sugar at night" only with diabetes or a glucose sensor). */
export const scenariosFor = (k: PersonId, p: AdultProfile): ScenarioId[] => SCENARIO_IDS.filter((s) => s !== 'hypo' || hasGlucose(k, p))
/** Whether the closed panel's summary shows the glucose chip. */
export const showsGlucose = (k: PersonId, p: AdultProfile) => p.glu != null && hasGlucose(k, p)

/** The tag Noa's answer shows for a signal rule (prototype `act`). Texts `wi.act.<rule>`. */
const toneOfLevel = (s: Signal): Zone => (s.level === 'now' || s.level === 'today' ? 'bad' : s.level === 'soon' ? 'warn' : 'info')

export type WhatIf =
  | { child: true; visit: Txt | null; zone: Zone; text: Txt; also: Txt[] }
  | { child: false; zone: Zone; kind: Txt; head: Txt; tags: { rule: SignalRuleId; zone: Zone }[]; urgent: Signal | null; heart: Forecast; tests: VtId[] }

/** What Noa would do with these readings (prototype whatIfHTML). `fam`: the person's family record rows (for the test choice). */
export function whatIf(k: PersonId, p: Profile, fam: FamRow[], name: Txt, parent: Txt | null): WhatIf {
  if (p.child) return childWhatIf(p, parent ?? name)
  const q: AdultProfile = { ...p, bmi: bmiOf(p) }
  const F = signalRules(k, q), urg = urgentOf(F)
  const T = selectTests(k, q, urg, fam)
  const zone: Zone = urg ? 'bad' : F.some((x) => x.level === 'soon') ? 'warn' : 'good'
  const head = urg
    ? (urg.rule.startsWith('G') ? tx('wi.head.speech', { name }) : urg.rule === 'L1' ? tx('wi.head.sugar') : tx('wi.head.doctor'))
    : F.length ? tx('wi.head.plan') : tx('wi.head.calm')
  return {
    child: false, zone, head, urgent: urg,
    kind: tx(urg ? 'wi.kind.now' : zone === 'warn' ? 'wi.kind.plan' : 'wi.kind.clear'),
    tags: F.map((x) => ({ rule: x.rule, zone: toneOfLevel(x) })),
    heart: forecast(q), tests: T.use.map((x) => x.id),
  }
}
function childWhatIf(p: ChildProfile, parent: Txt): WhatIf {
  const nx = WELL_CHILD.find((a) => a >= p.ageM), also: Txt[] = []
  if (p.ageM >= 18 && p.ageM < 30) also.push(tx('wi.child.mchat'))
  if (p.ageM >= 48) also.push(tx('wi.child.school'))
  const [zone, text]: [Zone, Txt] = p.overdueW >= 2 ? ['bad', tx('wi.child.overdue', { n: p.overdueW, parent })] : p.overdueW > 0 ? ['warn', tx('wi.child.due')] : ['good', tx('wi.child.ok')]
  return { child: true, visit: nx ? wellChildName(nx) : null, zone, text, also }
}
