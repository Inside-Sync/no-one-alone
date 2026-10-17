import type { RecoveryDoc, RecoveryRequest } from '@/data/contract'
import type { IconName } from '@/data/types'
import i18n, { intlLocale } from '@/i18n'

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

/**
 * Why each DEFAULT_PLAN item matters: a lowercased word in the medicine name or reminder text (core-api writes those,
 * in the person's own language) and its `me:recovery.why` line, in the language in use (display only). First match wins.
 */
const WHY_MATCH = [
  ['apixaban', 'apixaban'], ['perindopril', 'perindopril'], ['atorvastatin', 'atorvastatin'], ['amlodipine', 'amlodipine'],
  ['vitamin d', 'vitaminD'], ['aspirin', 'aspirin'], ['walk', 'walk'], ['blood pressure', 'bloodPressure'], ['speech', 'speech'],
  ['water', 'water'],
] as const

export type WhyKey = (typeof WHY_MATCH)[number][1]

/** The `me:recovery.why` line for one item, in the language in use. */
export const whyLine = (key: WhyKey): string => i18n.t(`me:recovery.why.${key}`)

const whyOf = (text: string) => {
  const t = text.toLowerCase()
  const hit = WHY_MATCH.find(([word]) => t.includes(word))
  return hit && whyLine(hit[1])
}

export type Med = RecoveryDoc['meds'][number]

export const isStopped = (m: Med) => m.change === 'Stop'

export interface Task { id: string; time: string; kind: 'MED' | 'ACTIVITY'; title: string; why?: string; audioPath?: string }

/** One task per reminder, in reminder order, minus any that name a stopped medicine; `id` matches the reminder key used for ticks. */
export function todayTasks(r: RecoveryDoc): Task[] {
  const stopped = r.meds.filter(isStopped).map((m) => m.name.toLowerCase())
  return r.reminders
    .filter((x) => !(x.kind === 'MED' && stopped.some((n) => x.text.toLowerCase().includes(n))))
    .map((x) => ({ id: x.time + x.text, time: x.time, kind: x.kind, title: x.text, why: whyOf(x.text), audioPath: x.audioPath }))
}

/** Medicine table time slots, keyed by their clock time. */
export const SLOTS = { '08:00': 'morning', '13:00': 'midday', '18:00': 'evening', '21:00': 'night' } as const

/** Medicines Margaret still takes, with why each one matters. */
export const medsExplained = (r: RecoveryDoc) => r.meds.filter((m) => !isStopped(m)).map((m) => ({ ...m, why: whyOf(m.name) }))

/** What Noa says at hand-off, worked out from the plan: new and stopped medicines, the first slot of the day, the GP follow-up (else the first). */
export function handoffFacts(r: RecoveryDoc) {
  const taking = r.meds.filter((m) => !isStopped(m))
  const time = [...taking, ...r.activities].flatMap((x) => x.times).sort()[0]
  const items = [
    ...taking.filter((m) => m.times.includes(time)).map((m) => `${m.name} ${m.dose}`),
    ...r.activities.filter((a) => a.times.includes(time)).map((a) => a.text),
  ]
  return {
    newMeds: r.meds.filter((m) => m.change === 'New').map((m) => m.name.toLowerCase()),
    stopMeds: r.meds.filter(isStopped).map((m) => m.name.toLowerCase()),
    next: time ? { time, items } : null,
    followUp: r.followUps.find((f) => /GP/i.test(f.text)) ?? r.followUps[0] ?? null,
  }
}

export const CALL_DAYS = [1, 3, 7, 14, 30] as const

/** Check-in call dates: the local date of `createdAt` plus each call day (display only, no calls are placed). */
export function followUpCalls(createdAt: string, tz: string): { day: number; date: string }[] {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(createdAt)).split('-').map(Number)
  return CALL_DAYS.map((day) => ({ day, date: new Date(Date.UTC(y, m - 1, d + day)).toISOString().slice(0, 10) }))
}

/** A `YYYY-MM-DD` calendar date for people: `Fri 23 Oct` in English, `T6 23/10` in Vietnamese, `10月23日(金)` in Japanese… */
export function dayLabel(date: string, lang = i18n.language): string {
  const d = new Date(`${date}T00:00:00Z`)
  if (!lang.startsWith('vi')) return new Intl.DateTimeFormat(intlLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)
  const wd = d.getUTCDay()
  return `${wd === 0 ? 'CN' : `T${wd + 1}`} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`
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
  if (r.followUps.length) steps.push({ key: 'appointments', vars: { list: r.followUps.map((f) => `${f.text} (${dayLabel(f.date)})`).join('; ') } })
  if (circle.length) steps.push({ key: 'circle', vars: { names: circle.join(', ') } })
  steps.push({ key: 'delivered', vars: {} })
  return steps
}

/** A glanceable icon for a task: tablets, or the kind of activity named in the reminder (display only). */
export function taskIcon(task: Pick<Task, 'kind' | 'title'>): IconName {
  if (task.kind === 'MED') return 'pill'
  const t = task.title.toLowerCase()
  if (t.includes('walk')) return 'footprints'
  if (t.includes('blood pressure')) return 'stethoscope'
  if (t.includes('speech')) return 'speech'
  if (t.includes('water')) return 'drop'
  return 'circle-check'
}

const localDate = (ms: number, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(ms)

/** Days at home since the plan arrived, in the person's local dates: the plan day is 0, so day N lines up with the day-N call. */
export function daysHome(createdAt: string, nowMs: number, tz: string): number {
  return Math.round((Date.parse(localDate(nowMs, tz)) - Date.parse(localDate(Date.parse(createdAt), tz))) / 86_400_000)
}

/** `morning` before 12:00, `afternoon` before 18:00, else `evening`, by the person's local time. */
export function partOfDay(nowMs: number, tz: string): 'morning' | 'afternoon' | 'evening' {
  const h = hhmm(nowMs, tz)
  return h < '12:00' ? 'morning' : h < '18:00' ? 'afternoon' : 'evening'
}

/**
 * The plan as Margaret's page shows it when there is no incident to post it to (mock mode, or before the night demo):
 * the doctor's notes stand in for the summary, and every ticked time becomes a reminder, as core-api would set them.
 */
export function localRecovery(body: RecoveryRequest, nowMs: number, tz: string): RecoveryDoc {
  const [y, m, d] = localDate(nowMs, tz).split('-').map(Number)
  const reminders: Reminder[] = [
    ...body.meds.filter((x) => !isStopped(x)).flatMap((x) => x.times.map((time) => ({ time, kind: 'MED' as const, text: `${x.name} ${x.dose}` }))),
    ...body.activities.flatMap((a) => a.times.map((time) => ({ time, kind: 'ACTIVITY' as const, text: a.reminder ?? a.text }))),
  ].sort((a, b) => a.time.localeCompare(b.time))
  return {
    ...body,
    createdAt: new Date(nowMs).toISOString(),
    followUps: body.followUps.map((f) => ({ ...f, date: new Date(Date.UTC(y, m - 1, d + f.inDays)).toISOString().slice(0, 10) })),
    summary: body.notes,
    reminders,
    fallback: true,
  }
}
