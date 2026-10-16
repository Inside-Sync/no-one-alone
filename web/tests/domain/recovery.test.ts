import { nextReminder } from '@/domain/recovery'

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
