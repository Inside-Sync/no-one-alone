import type { IconName, Voiced } from './types'

/** One task of the day in Moza's plan. `kind` is a code (`MED` tablets, `ACTIVITY` anything else), not text. */
export interface PlanTask {
  time: string
  kind: 'MED' | 'ACTIVITY'
  icon: IconName
  title: string
  why: string
  /** Already done at the time of the snapshot. */
  done: boolean
}

/**
 * The Treatment page (step 5 of the care record), served by `getTreatment()` from `locales/{en,ar}/data/treatment.json`.
 * Every card carries the source and the time of its data.
 */
export interface TreatmentData {
  plan: {
    meta: string
    source: string
    time: string
    summary: Voiced
    /** Days at home, 1 to 30. */
    day: number
    chips: { icon: IconName; tone: 'stop' | 'plain'; text: string }[]
  }
  reminders: { source: string; time: string; /** The local clock of the snapshot, `HH:MM`. */ now: string }
  tasks: { source: string; time: string; items: PlanTask[] }
  medicines: {
    source: string
    time: string
    items: { name: string; when: string; why: string; change: 'New' | 'Increased' | 'Continue' | 'Stop'; entry: string }[]
  }
  appointments: { source: string; time: string; items: { title: string; when: string; entry: string }[] }
  warning: { source: string; time: string }
  /** `done`: call days already made at the time of the snapshot. */
  calls: { source: string; time: string; done: number[] }
}
