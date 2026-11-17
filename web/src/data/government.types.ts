import type { ContextBar, IconName, Kpi, MiniStat, PillTone, Severity } from './types'

/* ---------- Government view: Population health and Programme signals ---------- */

/** One of the 17 Abu Dhabi areas on the district map. `col` and `row` place it on the design's 5 × 4 layout. */
export interface Area {
  name: string
  col: number
  row: number
  /** Adults screened in the last 90 days. */
  screened: number
  /** Actionable results in the last 90 days. */
  actionable: number
  /** Percent of actionable results where treatment started in time. */
  reached: number
  /** Percent of adults 40+ screened in the last 3 years. */
  coverage: number
  /** Median days from result to treatment. */
  days: number
  language: string
}

/** A tile of "Health and wellbeing": one value, its yearly trend and a target note. */
export interface WellbeingTile {
  label: string
  value: string
  unit: string
  delta: string
  note: string
  /** Colour of the trend and the change: good or warn. */
  tone: Severity
  spark: number[]
}

/** A condition of "Recovery after care": its share and the target line. */
export interface RecoveryRow {
  label: string
  note: string
  value: number
  target: number
}

export interface Headline {
  value: string
  label: string
}

export interface WeekValue {
  label: string
  value: number
}

export interface StatusItem {
  title: string
  detail: string
  pill: { tone: PillTone; text: string }
}

/** One of the 8 largest facilities, on the scatter and in the performance table. */
export interface Facility {
  name: string
  /** Short name printed next to its dot on the scatter. */
  shortName: string
  kind: 'hosp' | 'fhc'
  area: string
  /** Percent of capacity in use. */
  capacity: number
  /** Score out of 100. */
  effectiveness: number
  /** Percent of results in care in time. */
  inCare: number
  days: number
  /** Percent readmitted within 30 days; hospitals only. */
  readmitted: number | null
  open: number
  /** Percent with the outcome at 3 months. */
  outcome: number
  /** What the outcome counts: recovered after a stay, or diabetes and blood pressure controlled. */
  outcomeKind: 'recovered' | 'controlled'
}

export interface BalanceItem {
  icon: IconName
  tone: Severity
  title: string
  detail: string
}

/** A result open past its target, in the table "Results open past target". */
export interface StalledResult {
  name: string
  age: number
  area: string
  result: string
  openDays: number
  why: string
  language: string
  next: string
}

export interface FunnelStage {
  label: string
  value: number
  color: string
}

/** Referral slots a week against the need: a row of "Referral capacity vs need". */
export interface ReferralNeed {
  name: string
  slots: number
  need: number
}

/** A labelled percentage: a bar of "In care in time". */
export interface ShareRow {
  name: string
  percent: number
}

export interface ProgrammeRow {
  programme: string
  tests: string
  inCare: string
  outcome: string
}

export interface Campaign {
  title: string
  detail: string
  pill: { tone: PillTone; text: string }
}

export interface GovernmentData {
  context: ContextBar
  wellbeing: WellbeingTile[]
  recovery: { headlines: Headline[]; rows: RecoveryRow[]; note: string }
  kpis: Kpi[]
  areas: Area[]
  districtKicker: string
  screening: {
    pill: string
    weeks: WeekValue[]
    slots: { value: number; label: string; max: number }
    stats: MiniStat[]
    campaigns: Campaign[]
    approveToast: string
  }
  facilities: { rows: Facility[]; average: number; note: string; tableNote: string }
  balance: { items: BalanceItem[]; overflowToast: string }
  stalled: StalledResult[]
  funnel: FunnelStage[]
  funnelMinis: MiniStat[]
  referrals: ReferralNeed[]
  byLanguage: { rows: ShareRow[]; note: string }
  byContact: { rows: ShareRow[]; note: string }
  programmes: ProgrammeRow[]
  signalsSummary: (StatusItem & { icon: IconName; tone: 'bad' | 'warn' })[]
  footnote: string
}

/** A signal across Abu Dhabi: a row of the signals table. */
export interface SignalRow {
  title: string
  areas: string
  type: string
  affected: string
  since: string
  status: string
  /** Colour of the status pill. */
  tone: PillTone
}

export interface FeedItem {
  source: string
  age: string
  headline: string
  body: string
}

export interface Decision {
  title: string
  detail: string
}

export interface SignalsData {
  kpis: Kpi[]
  signals: SignalRow[]
  /** Results passing their target each week, oldest first: [not reached, waiting for a slot, declined or no owner]. */
  weekly: [number, number, number][]
  weeklyLabels: { notReached: string; waiting: string; declined: string }
  feed: FeedItem[]
  decisions: Decision[]
  footnote: string
}
