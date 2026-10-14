import type { CategoryId, PersonId, ShareMatrix } from '@/data/types'

export type { CategoryId }

/** The 11 consent categories in the prototype's CATS order (line 1890). Single source of the order. */
export const CATEGORY_IDS: readonly CategoryId[] = [
  'safety', 'checkin', 'heart', 'sleep', 'activity', 'mood', 'meds', 'speech', 'home', 'records', 'location',
]

export interface Category {
  id: CategoryId
  emoji: string
  name: string
  detail: string
}

/** Prototype `CATS` (line 1890), verbatim, in CATEGORY_IDS order. */
export const CATEGORIES: readonly Category[] = [
  { id: 'safety', emoji: '🚨', name: 'Safety alerts', detail: 'Falls, emergencies, heat warnings' },
  { id: 'checkin', emoji: '✅', name: '"I\'m OK" check-ins', detail: 'Whether she answered and is well' },
  { id: 'heart', emoji: '❤️', name: 'Heart, blood pressure, body', detail: 'Heart rate, BP, weight' },
  { id: 'sleep', emoji: '😴', name: 'Sleep', detail: 'Hours and how restful' },
  { id: 'activity', emoji: '🚶', name: 'Moving and steps', detail: 'Steps, walking, balance' },
  { id: 'mood', emoji: '😊', name: 'Mood and feelings', detail: 'How she says she feels' },
  { id: 'meds', emoji: '💊', name: 'Tablets', detail: 'Taken or missed' },
  { id: 'speech', emoji: '🗣️', name: 'Hearing and speech', detail: 'From her daily chats' },
  { id: 'home', emoji: '🏠', name: 'Home sensors', detail: 'Temperature, movement in 2 rooms' },
  { id: 'records', emoji: '📋', name: 'Health records', detail: 'Conditions, tests, visits' },
  { id: 'location', emoji: '📍', name: 'Home or out', detail: 'Never an address or a map' },
]

/** Lock-overlay copy, verbatim from the prototype's `applyLocks`. */
export function lockMessage(cat: CategoryId, paused: boolean): string {
  if (paused) return 'Margaret paused sharing until tomorrow'
  const name = CATEGORIES.find((c) => c.id === cat)?.name ?? ''
  return `Margaret keeps her ${name.toLowerCase()} private`
}

/**
 * Can `viewer` see `cat`? Safety alerts are always visible; pausing locks every
 * other category; otherwise the consent matrix decides.
 */
export function sees(share: ShareMatrix, paused: boolean, viewer: PersonId, cat: CategoryId): boolean {
  if (cat === 'safety') return true
  if (paused) return false
  return share[viewer]?.[cat] === true
}

export function countSees(share: ShareMatrix, paused: boolean, viewer: PersonId): number {
  return CATEGORY_IDS.filter((c) => sees(share, paused, viewer, c)).length
}
