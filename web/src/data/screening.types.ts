import type { LabelValue, Severity } from './types'

/** Pill tone of a case step; `jac` is the purple "a clinician goes first" pill. */
export type ScreeningTone = 'good' | 'warn' | 'bad' | 'plain' | 'jac'

/** One row of `Needs a person now`: a case Noa could not move on. */
export interface LoopCase {
  id: string
  /** Case number shown under the name, e.g. `SC-101`. */
  code: string
  name: string
  age: number
  result: string
  step: string
  stepTone: ScreeningTone
  why: string
  /** Seconds until the deadline when the page opens; negative means already late. */
  due: number
  /** Label of the row's button. */
  action: string
  /** Toast shown when the action is taken. */
  done: string
}

export interface LoopFeedItem {
  src: string
  text: string
}

/** The loop's "From patients and labs" feed. */
export interface LoopFeed {
  /** Minute of the day (0-1439) of the newest entry in `initial`; new entries count up from it. */
  clock: number
  initial: (LoopFeedItem & { time: string })[]
  /** Pushed when the page opens. */
  opened: LoopFeedItem
  /** Replayed one by one while the page is open. */
  stream: LoopFeedItem[]
}

/** A stage of the loop: cases in it, and the longest wait against its deadline. */
export interface LoopStep {
  label: string
  count: number
  note: string
  /** The longest wait is past the deadline. */
  late: boolean
}

export interface ClinicSlot {
  label: string
  booked: number
  total: number
}

export interface LoopSuggestion {
  title: string
  note: string
}

/** A result waiting for a doctor. */
export interface ReviewItem {
  id: string
  name: string
  age: number
  result: string
  tag: string
  tone: Severity | 'plain'
  /** Avatar colour. */
  color: string
}

/** The one-page pre-consult summary (only one result has the full version). */
export interface ReviewSummary {
  /** Id of the `ReviewItem` it belongs to. */
  id: string
  rows: LabelValue[]
  suggests: { text: string; note: string }[]
  /** Shown instead of the buttons once the plan is sent. */
  sent: string
}

export interface ReferralItem {
  id: string
  name: string
  to: string
  from: string
  why: string
  pref: string
  /** What Noa suggests: the slot to book. */
  slot: string
  tag: string
}

export interface ScreeningData {
  cases: LoopCase[]
  feed: LoopFeed
  steps: LoopStep[]
  slots: ClinicSlot[]
  suggestions: LoopSuggestion[]
  review: { items: ReviewItem[]; summary: ReviewSummary; otherHint: string }
  referrals: { understood: string; consent: string; items: ReferralItem[] }
}
