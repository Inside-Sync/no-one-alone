import { mix, ramp, rgbHex, shade } from '@/lib/color'
import { rng } from '@/lib/rng'
import { rng as fixtureRng } from '@/data/fixtures/rng'

test('shade, mix, ramp, rgbHex match the prototype helpers', () => {
  expect(shade('#efe3cf', 0.88)).toBe('rgb(210,200,182)')
  expect(shade('#ffffff', 2)).toBe('rgb(255,255,255)')
  expect(mix('#000000', '#ffffff', 0.5)).toBe('rgb(128,128,128)')
  expect(ramp(0, ['#8fd3c3', '#e2a32c', '#d9443f'])).toBe('rgb(143,211,195)')
  expect(ramp(1, ['#8fd3c3', '#e2a32c', '#d9443f'])).toBe('rgb(217,68,63)')
  expect(ramp(0.5, ['#8fd3c3', '#e2a32c', '#d9443f'])).toBe('rgb(226,163,44)')
  expect(rgbHex('rgb(226,163,44)')).toBe('#e2a32c')
})

test('rng is re-exported unchanged for fixtures', () => {
  const a = rng(11), b = fixtureRng(11)
  expect([a(), a(), a()]).toEqual([b(), b(), b()])
  expect(rng(1)()).toBeCloseTo(16806 / 2147483646, 12)
})
