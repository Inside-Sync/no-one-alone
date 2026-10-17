import { clipFor, noReplySecondsFor, overridesFor, presetSettings, ruleChecks, scenarioFor, simSeries } from '@/domain/simulator'

const night = presetSettings('night')
const stairs = presetSettings('stairs')
const asleep = presetSettings('asleep')

test('preset values', () => {
  expect(night).toEqual({ preset: 'night', hr: 142, moving: false, stillMin: 4, speech: 'slurred', davidPicksUp: false })
  expect(stairs).toMatchObject({ preset: 'stairs', hr: 136, moving: true, stillMin: 0, speech: 'clear' })
  expect(asleep).toMatchObject({ preset: 'asleep', hr: 57, moving: false, stillMin: 45, speech: 'clear' })
})

test('scenarioFor: night and asleep run stroke, stairs runs false-alarm', () => {
  expect([night, stairs, asleep].map(scenarioFor)).toEqual(['stroke', 'false-alarm', 'stroke'])
})

test('overridesFor: moving sends movementMin 0, still sends stillMin', () => {
  expect(overridesFor({ ...night, moving: true })).toEqual({ hr: 142, movementMin: 0 })
  expect(overridesFor(asleep)).toEqual({ hr: 57, movementMin: 45 })
})

test('noReplySecondsFor: 25 with clips, 10 for no answer', () => {
  expect(noReplySecondsFor(night)).toBe(25)
  expect(noReplySecondsFor({ ...night, speech: 'none' })).toBe(10)
})

test('clipFor per speech and question index', () => {
  expect([0, 1, 2, 3, 4].map((i) => clipFor(asleep, i))).toEqual(['/sim/clear-0.mp3', '/sim/clear-1.mp3', '/sim/clear-2.mp3', '/sim/clear-3.mp3', null])
  expect([0, 1, 2].map((i) => clipFor(night, i))).toEqual(['/sim/clear-0.mp3', '/sim/slurred-1.mp3', null])
  expect(clipFor({ ...night, speech: 'none' }, 0)).toBeNull()
})

test('simSeries: 40 deterministic points ending at hr, still for the last stillMin minutes', () => {
  const s = simSeries(night, 57)
  expect(s).toHaveLength(40)
  expect(s[0].minute).toBe(-39)
  expect(s[39]).toEqual({ minute: 0, hr: 142, moving: false })
  expect(s.slice(-4).every((r) => !r.moving)).toBe(true)
  expect(s[35].moving).toBe(true)
  expect(simSeries(night, 57)).toEqual(s)
  expect(simSeries(asleep, 57).filter((r) => r.moving)).toHaveLength(0)
  expect(simSeries(stairs, 57).every((r) => r.moving)).toBe(true)
})

test('ruleChecks: night passes both, asleep fails heart rate', () => {
  expect(ruleChecks(night, 57)).toEqual({ still: true, hr: true, threshold: 87 })
  expect(ruleChecks(asleep, 57)).toEqual({ still: true, hr: false, threshold: 87 })
  expect(ruleChecks(stairs, 57).still).toBe(false)
})
