import { CATEGORY_IDS } from '../../domain/consent'
import type { CategoryId, PersonId, ShareMatrix } from '../types'

/** Category order used by the prototype's CATS array (line 1890). */
export const CATEGORY_ORDER: readonly CategoryId[] = CATEGORY_IDS

const row = (bits: Record<CategoryId, 0 | 1>): Record<CategoryId, boolean> =>
  Object.fromEntries(CATEGORY_ORDER.map((c) => [c, bits[c] === 1])) as Record<CategoryId, boolean>

/** Default consent matrix: the prototype's SHARE object (lines 1891–1896), booleans instead of 1/0. */
export const defaultShare: ShareMatrix = {
  james: row({ safety: 1, checkin: 1, heart: 1, sleep: 1, activity: 1, mood: 0, meds: 1, speech: 1, home: 0, records: 1, location: 0 }),
  sarah: row({ safety: 1, checkin: 1, heart: 1, sleep: 1, activity: 1, mood: 0, meds: 0, speech: 0, home: 0, records: 0, location: 0 }),
  david: row({ safety: 1, checkin: 1, heart: 0, sleep: 0, activity: 0, mood: 0, meds: 1, speech: 0, home: 1, records: 0, location: 0 }),
  priya: row({ safety: 1, checkin: 1, heart: 1, sleep: 0, activity: 1, mood: 0, meds: 1, speech: 0, home: 1, records: 0, location: 0 }),
  gp: row({ safety: 1, checkin: 0, heart: 1, sleep: 1, activity: 1, mood: 0, meds: 1, speech: 1, home: 0, records: 1, location: 0 }),
  hosp: row({ safety: 1, checkin: 0, heart: 0, sleep: 0, activity: 0, mood: 0, meds: 0, speech: 0, home: 0, records: 1, location: 0 }),
}

export const PERSON_ORDER: readonly PersonId[] = ['james', 'sarah', 'david', 'priya', 'gp', 'hosp']
