import type { CategoryId, IconName, PersonId, ShareMatrix } from '@/data/types'
import i18n from '@/i18n'

export type { CategoryId }

/** The 11 consent categories in the prototype's CATS order (line 1890). Single source of the order. */
export const CATEGORY_IDS: readonly CategoryId[] = [
  'safety', 'checkin', 'heart', 'sleep', 'activity', 'mood', 'meds', 'speech', 'home', 'records', 'location',
]

export interface Category {
  readonly id: CategoryId
  readonly icon: IconName
  readonly name: string
  readonly detail: string
}

const ICON: Record<CategoryId, IconName> = {
  safety: 'siren', checkin: 'circle-check', heart: 'heart', sleep: 'bed', activity: 'footprints', mood: 'smile',
  meds: 'pill', speech: 'speech', home: 'home', records: 'clipboard-list', location: 'map-pin',
}

/** Prototype `CATS` (line 1890), in CATEGORY_IDS order; `name` and `detail` come from `privacy:categories` when read. */
export const CATEGORIES: readonly Category[] = CATEGORY_IDS.map((id) => ({
  id,
  icon: ICON[id],
  get name() { return i18n.t(`privacy:categories.${id}.name`) },
  get detail() { return i18n.t(`privacy:categories.${id}.detail`) },
}))

/** Lock-overlay copy (the prototype's `applyLocks`), in the current language. */
export function lockMessage(cat: CategoryId, paused: boolean): string {
  if (paused) return i18n.t('common:lock.paused')
  const name = CATEGORIES.find((c) => c.id === cat)?.name ?? ''
  return i18n.t('common:lock.keeps', { name: name.toLowerCase() })
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
