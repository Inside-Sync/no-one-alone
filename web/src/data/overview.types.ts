import type { Kpi } from './types'

/** One facility-level capacity line: `used` of `total` (beds, cubicles or slots). */
export interface CapacityLine {
  label: string
  used: number
  total: number
}

/** A department row of "Departments and capacity". Patients per doctor and the status band are worked out from the numbers. */
export interface OverviewDepartment {
  name: string
  /** Display text such as `30 cubicles`. */
  capacity: string
  used: number
  total: number
  doctor: string
  onShift: number
  flow: string
}

/** A bar with the note under it ("Clot-busting within 60 minutes"). */
export interface OverviewMeasure {
  pct: number
  note: string
}

export interface OverviewCondition {
  name: string
  patients: number
  inTime: OverviewMeasure
  recovered: OverviewMeasure
  /** Readmitted in 30 days, text such as `5.6%`; null shows a dash. */
  readmitted: string | null
}

/** The overview page data, served by the repo method `getOverview()` from `locales/{en,ar}/data/overview.json`. */
export interface OverviewData {
  kpis: Kpi[]
  capacity: {
    /** Beds in use: 156 of 180. */
    used: number
    total: number
    lines: CapacityLine[]
  }
  effectiveness: {
    /** Abu Dhabi average the score is compared with. */
    average: number
    /** Share of the facilities it is the highest of, as a count (8 largest facilities). */
    ofFacilities: number
    /** Percent values; the score is their rounded mean. */
    measures: { label: string; value: number }[]
  }
  departments: OverviewDepartment[]
  conditions: OverviewCondition[]
}
