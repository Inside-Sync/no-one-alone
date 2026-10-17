import type { RecoveryDoc } from '@/data/contract'
import { CALL_DAYS, dayLabel, deliverySteps, followUpCalls, handoffFacts, medsExplained, nextReminder, todayTasks } from '@/domain/recovery'
import en from '@/locales/en/me.json'

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
    { time: '10:00', kind: 'ACTIVITY', text: 'Time to walk 20 minutes daily.', audioPath: 'b.mp3' },
  ],
  ...extra,
})

test('todayTasks follows reminder order and attaches why only for known items', () => {
  const tasks = todayTasks(doc())
  expect(tasks.map((t) => t.time)).toEqual(['08:00', '09:00', '10:00'])
  expect(tasks[0]).toMatchObject({ id: '08:00Time for your aspirin, 100 mg.', kind: 'MED', title: 'Time for your aspirin, 100 mg.', why: 'Stop taking this. Apixaban does its job now.', audioPath: 'a.mp3' })
  expect(tasks[1].why).toBeUndefined()
  expect(tasks[2].why).toBe('Gentle walking helps the brain heal and keeps blood pressure down.')
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
  expect(steps[3].vars).toEqual({ list: 'GP check (Sat 24 Oct)' })
  expect(steps[4].vars).toEqual({ names: 'Lan, Minh' })
})

test('deliverySteps says the notes were used on fallback and drops empty circle and appointments', () => {
  const keys = deliverySteps(doc({ fallback: true }), []).map((s) => s.key)
  expect(keys).toEqual(['summaryFallback', 'reminders', 'calls', 'delivered'])
})

const plan = {
  meds: [
    { name: 'Warfarin', dose: '3 mg', times: ['18:00'], change: 'New' as const },
    { name: 'Ramipril', dose: '5 mg', times: ['08:00'], change: 'New' as const },
    { name: 'Atorvastatin', dose: '40 mg', times: ['21:00'], change: 'Increased' as const },
    { name: 'Clopidogrel', dose: '75 mg', times: ['07:00'], change: 'Stop' as const },
    { name: 'Vitamin D', dose: '1000 IU', times: ['08:00'] },
  ],
  activities: [{ text: 'Walk', times: ['08:00', '10:00'] }, { text: 'No driving', times: [] }],
  followUps: [{ text: 'Physio home visit', inDays: 3, date: '2026-10-20' }, { text: 'GP review with Dr Patel at 10:30', inDays: 6, date: '2026-10-23' }],
}

test('todayTasks drops a medicine reminder for a stopped medicine', () => {
  const tasks = todayTasks(doc({ ...plan, reminders: [
    { time: '07:00', kind: 'MED', text: 'Time for your clopidogrel, 75 mg.' },
    { time: '08:00', kind: 'MED', text: 'Time for your ramipril, 5 mg.' },
  ] }))
  expect(tasks.map((t) => t.title)).toEqual(['Time for your ramipril, 5 mg.'])
})

test('medsExplained leaves out stopped medicines', () => {
  expect(medsExplained(doc(plan)).map((m) => m.name)).toEqual(['Warfarin', 'Ramipril', 'Atorvastatin', 'Vitamin D'])
})

test('handoffFacts reads new and stopped medicines, the first slot and the GP follow-up from the plan', () => {
  expect(handoffFacts(doc(plan))).toEqual({
    newMeds: ['warfarin', 'ramipril'],
    stopMeds: ['clopidogrel'],
    next: { time: '08:00', items: ['Ramipril 5 mg', 'Vitamin D 1000 IU', 'Walk'] },
    followUp: plan.followUps[1],
  })
})

test('dayLabel: Fri 23 Oct in English, T6 23/10 in Vietnamese, CN on Sunday; no day shift', () => {
  expect(dayLabel('2026-10-23', 'en')).toBe('Fri 23 Oct')
  expect(dayLabel('2026-10-23', 'vi')).toBe('T6 23/10')
  expect(dayLabel('2026-10-25', 'vi')).toBe('CN 25/10')
})

test('the default reminders read naturally and keep their WHY lines', () => {
  const r = (text: string) => ({ time: '10:00', kind: 'ACTIVITY' as const, text })
  const tasks = todayTasks(doc({ reminders: [
    r('Time for your 20-minute walk.'), r('Time to check your blood pressure. Aim for under 130/80.'),
    r('Time for your speech exercises, 15 minutes.'), r('Time for a glass of water.'),
  ] }))
  expect(tasks.map((t) => t.why)).toEqual([en.recovery.why.walk, en.recovery.why.bloodPressure, en.recovery.why.speech, en.recovery.why.water])
})
