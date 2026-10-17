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

/** Why each DEFAULT_PLAN item matters, keyed by lowercased medicine name or activity text (display only). */
export const WHY: Record<string, string> = {
  aspirin: 'Thins the blood a little so a new clot is less likely.',
  atorvastatin: 'Lowers cholesterol to protect the blood vessels in the brain.',
  amlodipine: 'Keeps blood pressure down, the biggest cause of a second stroke.',
  'walk for 15 minutes with your stick': 'Gentle walking rebuilds strength and balance and helps prevent falls.',
  'check your blood pressure': 'Readings show the family and GP if the medicines are working.',
  'speech exercises from your sheet': 'Daily practice helps speech come back faster in the first weeks.',
  'drink a glass of water': 'Staying hydrated keeps blood flowing and helps avoid dizziness.',
}

export interface Task { id: string; time: string; kind: 'MED' | 'ACTIVITY'; title: string; why?: string; audioPath?: string }

/** One task per reminder, in reminder order; `id` matches the reminder key used for ticks. */
export function todayTasks(r: RecoveryDoc): Task[] {
  return r.reminders.map((x) => {
    const text = x.text.toLowerCase()
    const key = Object.keys(WHY).find((k) => text.includes(k))
    return { id: x.time + x.text, time: x.time, kind: x.kind, title: x.text, why: key && WHY[key], audioPath: x.audioPath }
  })
}

export const CALL_DAYS = [1, 3, 7, 14, 30] as const

/** Check-in call dates: the local date of `createdAt` plus each call day (display only, no calls are placed). */
export function followUpCalls(createdAt: string, tz: string): { day: number; date: string }[] {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(createdAt)).split('-').map(Number)
  return CALL_DAYS.map((day) => ({ day, date: new Date(Date.UTC(y, m - 1, d + day)).toISOString().slice(0, 10) }))
}

/** i18n key under hospital:ed.recovery.steps with its values. */
export type Step = { key: 'summary' | 'summaryFallback' | 'reminders' | 'calls' | 'appointments' | 'circle' | 'delivered'; vars: Record<string, string | number> }

/** What the agent delivered, worked out only from the stored recovery doc. */
export function deliverySteps(r: RecoveryDoc, circle: string[]): Step[] {
  const steps: Step[] = [
    { key: r.fallback ? 'summaryFallback' : 'summary', vars: {} },
    { key: 'reminders', vars: { n: r.reminders.length, voiced: r.reminders.filter((x) => x.audioPath).length } },
    { key: 'calls', vars: { days: CALL_DAYS.join(', ') } },
  ]
  if (r.followUps.length) steps.push({ key: 'appointments', vars: { list: r.followUps.map((f) => `${f.text} (${f.date})`).join('; ') } })
  if (circle.length) steps.push({ key: 'circle', vars: { names: circle.join(', ') } })
  steps.push({ key: 'delivered', vars: {} })
  return steps
}
