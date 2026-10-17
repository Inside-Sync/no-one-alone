import { PRESETS, SIM_DEFAULTS, alertRun, blankWatch, clipFor, clockText, setHr, setStill, tick, watchNote, type Watch } from '@/domain/simulator'

const ticks = (w: Watch, n: number) => Array.from({ length: n }).reduce<Watch>((x) => tick(x), w)

test('clipFor: red-0, red-1, then none; the mic option sends nothing', () => {
  expect([0, 1, 2].map((i) => clipFor({ ...SIM_DEFAULTS, speech: 'slurred' }, i))).toEqual(['/sim/red-0.mp3', '/sim/red-1.mp3', null])
  expect(clipFor(SIM_DEFAULTS, 0)).toBeNull()
})

test('tick: one more reading, 40 kept, clock + 1; still minutes grow while still and stay 0 while moving', () => {
  const night = PRESETS.night()
  const next = tick(night)
  expect(next.readings).toHaveLength(40)
  expect(next.readings[39].minute).toBe(night.readings[39].minute + 1)
  expect(next.readings[38]).toEqual(night.readings[39])
  expect(next.clock).toBe(night.clock + 1)
  expect(next.stillMin).toBe(9)
  expect(next.readings[39].moving).toBe(false)
  const blank = tick(blankWatch())
  expect(blank.stillMin).toBe(0)
  expect(blank.readings[39].moving).toBe(true)
})

test('setStill marks exactly the last n readings still and leaves their heart rate', () => {
  const w = setStill(blankWatch(), 10)
  expect(w.stillMin).toBe(10)
  expect(w.readings.map((r) => r.moving)).toEqual(Array.from({ length: 40 }, (_, i) => i < 30))
  expect(w.readings.map((r) => r.hr)).toEqual(blankWatch().readings.map((r) => r.hr))
})

test('alertRun counts only the trailing high and still readings; the night preset goes 6 to 10 in 4 ticks', () => {
  const night = PRESETS.night()
  expect(alertRun(night.readings)).toBe(6)
  expect(alertRun([...night.readings.slice(0, 39), { ...night.readings[39], moving: true }])).toBe(0)
  expect(alertRun(tick(night).readings)).toBe(7)
  expect(alertRun(ticks(night, 4).readings)).toBe(10)
})

test('watchNote: alert, moving, resting, counting, normal', () => {
  expect(watchNote(ticks(PRESETS.night(), 4))).toBe('alert')
  expect(watchNote(setHr(blankWatch(), 140))).toBe('moving')
  expect(watchNote(setStill(blankWatch(), 5))).toBe('resting')
  expect(watchNote(PRESETS.night())).toBe('counting')
  expect(watchNote(blankWatch())).toBe('normal')
})

test('clockText: HH:MM, zero padded, wraps at midnight', () => {
  expect(clockText(90)).toBe('01:30')
  expect(clockText(1440 + 5)).toBe('00:05')
})
