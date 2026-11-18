import type { DbTable } from '../engine/types'

/** Family member status (`FamState.status`): label key and the tone the prototype coloured it with (`good | info | warn | bad | muted`). */
export const FAMILY_STATUS: Record<string, { label: string; tone: 'good' | 'info' | 'warn' | 'bad' | 'muted' }> = {
  ok: { label: 'family.status.ok', tone: 'good' },
  care: { label: 'family.status.care', tone: 'info' },
  booked: { label: 'family.status.booked', tone: 'info' },
  due: { label: 'family.status.due', tone: 'warn' },
  overdue: { label: 'family.status.overdue', tone: 'bad' },
  alert: { label: 'family.status.alert', tone: 'bad' },
  declined: { label: 'family.status.declined', tone: 'muted' },
}

/** The note shown under each demo-database tab: `db.notes.<table>`. */
export const dbNoteKey = (table: DbTable): string => `db.notes.${table}`
