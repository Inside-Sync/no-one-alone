import type { ProgId, TimeId, Tone, UrgencyId } from './types'

/**
 * Department of Health programmes (demo summary; confirm against the current DoH standards before any pilot). Texts:
 * `prog.<id>.{name,short,who,what}`. `mins` is the visit length, `home` a kit done at home.
 */
export interface Programme { id: ProgId; mins: number; home?: boolean }
export const PROGRAMMES: Record<ProgId, Programme> = {
  dxa: { id: 'dxa', mins: 15 },
  ifhas: { id: 'ifhas', mins: 30 },
  lipid: { id: 'lipid', mins: 0 },
  a1c: { id: 'a1c', mins: 10 },
  dmeye: { id: 'dmeye', mins: 15 },
  dmkid: { id: 'dmkid', mins: 10 },
  bowel: { id: 'bowel', mins: 0, home: true },
  breast: { id: 'breast', mins: 20 },
  cervix: { id: 'cervix', mins: 15 },
  flu: { id: 'flu', mins: 5 },
  quit: { id: 'quit', mins: 20 },
  well: { id: 'well', mins: 30 },
  mchat: { id: 'mchat', mins: 10 },
  school: { id: 'school', mins: 20 },
}
export const PROGRAMME_COUNT = Object.keys(PROGRAMMES).length

/**
 * Population priority of each programme in the pathway (lower first). `lipid` is 0 with a consented genomic result and `a1c` is 0
 * after diabetes in pregnancy or with thirst; otherwise both are 5. Anything not listed is 6 (prototype `pri`).
 */
export const PRIORITY: Partial<Record<ProgId, number>> = { dxa: 2, dmeye: 1, dmkid: 1, breast: 2, cervix: 2, bowel: 3, ifhas: 4, flu: 9 }
export const PRIORITY_DEFAULT = 6
export const PRIORITY_RAISED = 0
export const PRIORITY_NORMAL = 5

/** Urgency levels: label `urgency.<id>`, days to the due-by date and tone (prototype URG). */
export const URGENCY: Record<UrgencyId, { days: number; tone: Tone }> = {
  now: { days: 0, tone: 'bad' },
  today: { days: 0, tone: 'bad' },
  h24: { days: 1, tone: 'bad' },
  w1: { days: 7, tone: 'warn' },
  w2: { days: 14, tone: 'warn' },
  m1: { days: 30, tone: 'info' },
  m3: { days: 90, tone: 'muted' },
}
export const URGENCY_ORDER: readonly UrgencyId[] = ['now', 'today', 'h24', 'w1', 'w2', 'm1', 'm3']
/** Items up to and including this urgency are escalated to the doctor even when the person says "not now" (rule U1). */
export const ESCALATE_UP_TO: UrgencyId = 'w2'
/** The navigator names the first clinical item as "first and most urgent" up to this urgency. */
export const FIRST_UP_TO: UrgencyId = 'h24'

/** Booking times (prototype TIMES) and the slot each gives (SLOT). Texts `times.<id>`, `slots.<id>.{full,day}`. */
export const TIME_IDS: readonly TimeId[] = ['eve', 'sat', 'am', 'pm']
/** Default booking time per person (Noa Voice "When suits you best?"); everyone else Saturday morning. */
export const DEFAULT_TIME: Partial<Record<string, TimeId>> = { khalid: 'eve', amna: 'pm', moza: 'am', saeed: 'am' }
