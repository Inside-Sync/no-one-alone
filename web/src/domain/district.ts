import type { Area, StalledResult } from '@/data/government.types'
import i18n from '@/i18n'
import { isSuppressed, suppressSplit } from './suppression'

/** The four measures of the district map: results open past target, reached care in time, coverage, days to treatment. */
export type DistrictModel = 'open' | 'reach' | 'cov' | 'days'

export const DISTRICT_MODEL_IDS: readonly DistrictModel[] = ['open', 'reach', 'cov', 'days']

/** Measures where a tall column is a good one, so the colour runs the other way. */
export const HIGHER_IS_BETTER: Readonly<Record<DistrictModel, boolean>> = { open: false, reach: true, cov: true, days: false }

/** `DM` of the design: title, subtitle and the tag suffix of a map measure, in the current language. */
export function districtModel(model: DistrictModel): { title: string; subtitle: string; unit: string } {
  return {
    title: i18n.t(`government:population.district.models.${model}.title`),
    subtitle: i18n.t(`government:population.district.models.${model}.subtitle`),
    unit: i18n.t(`government:population.district.models.${model}.unit`),
  }
}

const PERCENT = 100

/** `subOpen`: actionable results not yet in care, from the share that reached care in time. */
export function openPastTarget(a: Area): number {
  return Math.round(a.actionable * (1 - a.reached / PERCENT))
}

/** `subVal`: the column height of one area under a measure. */
export function metricFor(a: Area, model: DistrictModel): number {
  switch (model) {
    case 'open': return openPastTarget(a)
    case 'reach': return a.reached
    case 'cov': return a.coverage
    case 'days': return a.days
  }
}

/**
 * Whether an area's column must be hidden (small-cell suppression): the count itself is under 10 (`open`), or the rate or
 * median comes from fewer than 10 people (actionable results for `reach`, adults screened for `cov` and `days`).
 */
export function isAreaMetricHidden(a: Area, model: DistrictModel): boolean {
  switch (model) {
    case 'open': return isSuppressed(openPastTarget(a))
    case 'reach': return isSuppressed(a.actionable)
    case 'cov':
    case 'days': return isSuppressed(a.screened)
  }
}

/** Longest open first; results open for the same time keep the order they were given. */
export function longestOpenFirst(rows: readonly StalledResult[]): StalledResult[] {
  return [...rows].sort((a, b) => b.openDays - a.openDays)
}

/**
 * Hidden flags for every area under a measure. `open` is a count shown beside its page total (the "Open past target" tile),
 * so it gets complementary suppression: with exactly one area under 10, the smallest visible one is hidden too, and
 * total minus the visible columns can no longer reveal either. The other measures are rates or medians with no total to subtract.
 */
export function areaMetricHidden(areas: readonly Area[], model: DistrictModel): boolean[] {
  if (model === 'open') return suppressSplit(areas.map(openPastTarget)).map((c) => c === null)
  return areas.map((a) => isAreaMetricHidden(a, model))
}
