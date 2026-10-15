import type { PillTone, Suburb, VisitRow } from '@/data/types'
import i18n from '@/i18n'

export type DistrictModel = 'high' | 'alone' | 'heat' | 'gap'

export const DISTRICT_MODEL_IDS: readonly DistrictModel[] = ['high', 'alone', 'heat', 'gap']

/** `DM` (prototype line 1324): title, subtitle and the tag suffix of a map model, in the current language. */
export function districtModel(model: DistrictModel): { title: string; subtitle: string; unit: string } {
  return {
    title: i18n.t(`community:overview.district.models.${model}.title`),
    subtitle: i18n.t(`community:overview.district.models.${model}.subtitle`),
    unit: i18n.t(`community:overview.district.models.${model}.unit`),
  }
}

/** Visits a high-risk resident needs per week, and visits one volunteer covers per week (`subVal`, line 1323). */
export const VISITS_NEEDED_PER_HIGH_RISK = 2
export const VISITS_PER_VOLUNTEER = 4
const PERCENT = 100

/** `subVal`: the column height of one suburb under a model. */
export function metricFor(s: Suburb, model: DistrictModel): number {
  switch (model) {
    case 'high': return s.highRisk
    case 'alone': return s.alonePct
    case 'heat': return Math.round(s.heat * PERCENT)
    case 'gap': return Math.max(0, s.highRisk * VISITS_NEEDED_PER_HIGH_RISK - s.volunteers * VISITS_PER_VOLUNTEER)
  }
}

/** Risk level by its pill tone (High = bad, Medium = warn, Watch = plain); the `risk` text is translated, the tone is not. */
const RISK_RANK: Partial<Record<PillTone, number>> = { bad: 3, warn: 2, plain: 1 }

/** Highest risk first; people at the same level keep the order they were given. */
export function rankVisits(rows: readonly VisitRow[]): VisitRow[] {
  return [...rows].sort((a, b) => (RISK_RANK[b.tone] ?? 0) - (RISK_RANK[a.tone] ?? 0))
}
