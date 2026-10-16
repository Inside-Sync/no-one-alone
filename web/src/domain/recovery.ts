import type { RecoveryDoc } from '@/data/contract'

export type Reminder = RecoveryDoc['reminders'][number]

const hhmm = (nowMs: number, tz: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(nowMs)

/** First reminder at or after the local time of `nowMs`, else the first one tomorrow (reminders are sorted by time). */
export function nextReminder(reminders: Reminder[], nowMs: number, tz: string): { reminder: Reminder; tomorrow: boolean } | null {
  if (!reminders.length) return null
  const now = hhmm(nowMs, tz)
  const reminder = reminders.find((r) => r.time >= now)
  return reminder ? { reminder, tomorrow: false } : { reminder: reminders[0], tomorrow: true }
}
