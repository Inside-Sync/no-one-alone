import type { RecoveryDoc } from '@/data/contract'
import { CALL_DAYS, WHY, deliverySteps, followUpCalls, nextReminder, todayTasks } from '@/domain/recovery'

const R = [
  { time: '08:00', kind: 'MED' as const, text: 'aspirin' },
  { time: '18:00', kind: 'MED' as const, text: 'amlodipine' },
  { time: '20:00', kind: 'MED' as const, text: 'atorvastatin' },
]
const at = (iso: string) => Date.parse(iso)

test('picks the first reminder at or after local now', () => {
  expect(nextReminder(R, at('2026-10-16T12:30:00Z'), 'UTC')).toEqual({ reminder: R[1], tomorrow: false })
  expect(nextReminder(R, at('2026-10-16T18:00:00Z'), 'UTC')).toEqual({ reminder: R[1], tomorrow: false })
})

test('rolls to the first one tomorrow after the last slot', () => {
  expect(nextReminder(R, at('2026-10-16T20:01:00Z'), 'UTC')).toEqual({ reminder: R[0], tomorrow: true })
})

test('uses the given timezone', () => {
  // 20:30 UTC is 07:30 next day in Sydney (UTC+11 in October): next is 08:00 today there.
  expect(nextReminder(R, at('2026-10-16T20:30:00Z'), 'Australia/Sydney')).toEqual({ reminder: R[0], tomorrow: false })
})

test('no reminders gives null', () => {
  expect(nextReminder([], 0, 'UTC')).toBeNull()
})

const doc = (extra: Partial<RecoveryDoc> = {}): RecoveryDoc => ({
  createdAt: '2026-10-16T22:00:00Z', staffName: 's', diagnosis: 'd', notes: 'n', meds: [], activities: [], followUps: [],
  summary: 'sum', fallback: false,
  reminders: [
    { time: '08:00', kind: 'MED', text: 'Time for your aspirin, 100 mg.', audioPath: 'a.mp3' },
    { time: '09:00', kind: 'ACTIVITY', text: 'Time to juggle.' },
    { time: '10:00', kind: 'ACTIVITY', text: 'Time to walk for 15 minutes with your stick.', audioPath: 'b.mp3' },
  ],
  ...extra,
})

test('todayTasks follows reminder order and attaches why only for known items', () => {
  const tasks = todayTasks(doc())
  expect(tasks.map((t) => t.time)).toEqual(['08:00', '09:00', '10:00'])
  expect(tasks[0]).toMatchObject({ id: '08:00Time for your aspirin, 100 mg.', kind: 'MED', title: 'Time for your aspirin, 100 mg.', why: WHY.aspirin, audioPath: 'a.mp3' })
  expect(tasks[1].why).toBeUndefined()
  expect(tasks[2].why).toBe(WHY['walk for 15 minutes with your stick'])
})

test('followUpCalls dates each call day from the local date of createdAt', () => {
  const calls = followUpCalls('2026-10-16T22:00:00Z', 'Australia/Sydney')
  expect(calls.map((c) => c.day)).toEqual([...CALL_DAYS])
  expect(calls[0]).toEqual({ day: 1, date: '2026-10-18' })
  expect(calls[4]).toEqual({ day: 30, date: '2026-11-16' })
})

test('deliverySteps reports what the doc shows', () => {
  const steps = deliverySteps(doc({ followUps: [{ text: 'GP check', inDays: 7, date: '2026-10-24' }] }), ['Lan', 'Minh'])
  expect(steps.map((s) => s.key)).toEqual(['summary', 'reminders', 'calls', 'appointments', 'circle', 'delivered'])
  expect(steps[1].vars).toEqual({ n: 3, voiced: 2 })
  expect(steps[2].vars).toEqual({ days: '1, 3, 7, 14, 30' })
  expect(steps[3].vars).toEqual({ list: 'GP check (2026-10-24)' })
  expect(steps[4].vars).toEqual({ names: 'Lan, Minh' })
})

test('deliverySteps says the notes were used on fallback and drops empty circle and appointments', () => {
  const keys = deliverySteps(doc({ fallback: true }), []).map((s) => s.key)
  expect(keys).toEqual(['summaryFallback', 'reminders', 'calls', 'delivered'])
})
