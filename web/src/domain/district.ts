import type { Area, StalledResult } from '@/data/government.types'
import i18n from '@/i18n'

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

/** Longest open first; results open for the same time keep the order they were given. */
export function longestOpenFirst(rows: readonly StalledResult[]): StalledResult[] {
  return [...rows].sort((a, b) => b.openDays - a.openDays)
}
