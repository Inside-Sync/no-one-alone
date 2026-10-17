import { NIGHT_ALERT, clipFor, overridesFor, ruleChecks, scenarioFor, simSeries } from '@/domain/simulator'

test('one case: the night alert, HR 137 and still 10 min, runs stroke', () => {
  expect(overridesFor(NIGHT_ALERT)).toEqual({ hr: 137, movementMin: 10 })
  expect(scenarioFor()).toBe('stroke')
})

test('clipFor: red-0, red-1, then none; the mic option sends nothing', () => {
  expect([0, 1, 2].map((i) => clipFor(NIGHT_ALERT, i))).toEqual(['/sim/red-0.mp3', '/sim/red-1.mp3', null])
  expect(clipFor({ ...NIGHT_ALERT, speech: 'mic' }, 0)).toBeNull()
})

test('simSeries: 40 deterministic points, above 120 and still for the last 10 minutes', () => {
  const s = simSeries(NIGHT_ALERT, 57)
  expect(s).toHaveLength(40)
  expect(s[39]).toEqual({ minute: 0, hr: 137, moving: false })
  expect(s.slice(-10).every((r) => !r.moving && r.hr > 120)).toBe(true)
  expect(s[29].moving).toBe(true)
  expect(s[29].hr).toBeLessThan(120)
  expect(simSeries(NIGHT_ALERT, 57)).toEqual(s)
})

test('ruleChecks: heart rate above 120 and still for 10 minutes or more', () => {
  expect(ruleChecks(NIGHT_ALERT)).toEqual({ still: true, hr: true })
  expect(ruleChecks({ ...NIGHT_ALERT, stillMin: 9 }).still).toBe(false)
  expect(ruleChecks({ ...NIGHT_ALERT, hr: 120 }).hr).toBe(false)
})
