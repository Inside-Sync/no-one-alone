import type { Suburb, VisitRow } from '@/data/types'

export type DistrictModel = 'high' | 'alone' | 'heat' | 'gap'

export const DISTRICT_MODEL_IDS: readonly DistrictModel[] = ['high', 'alone', 'heat', 'gap']

/** `DM` (prototype line 1324): title, subtitle and the tag suffix of each map model. */
export const DISTRICT_MODELS: Record<DistrictModel, { title: string; subtitle: string; unit: string }> = {
  high: { title: 'High-risk residents', subtitle: 'Column height = people at high risk · tile colour = heat vulnerability', unit: ' high risk' },
  alone: { title: 'Living alone', subtitle: 'Column height = share of enrolled residents living alone', unit: ' % alone' },
  heat: { title: 'Heat vulnerability', subtitle: 'Index from age, air-con, tree cover and housing', unit: ' heat index' },
  gap: { title: 'Visit gap', subtitle: 'Weekly visits needed minus volunteer capacity', unit: ' visits short' },
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

const RISK_RANK: Record<string, number> = { High: 3, Medium: 2, Watch: 1 }

/** Highest risk first; people at the same level keep the order they were given. */
export function rankVisits(rows: readonly VisitRow[]): VisitRow[] {
  return [...rows].sort((a, b) => (RISK_RANK[b.risk] ?? 0) - (RISK_RANK[a.risk] ?? 0))
}
