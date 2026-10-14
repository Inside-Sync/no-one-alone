import { contrast, fillForWhiteText, mix, ramp, rgbHex, shade } from '@/lib/color'
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

describe('contrast helpers (a11y, Task 14)', () => {
  test('contrast matches WCAG reference values', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 5)
    expect(contrast('#ef4e4a', '#ffffff')).toBeCloseTo(3.58, 2)
  })

  test('fillForWhiteText keeps passing colours and darkens failing ones just enough', () => {
    expect(fillForWhiteText('#2563a8')).toBe('#2563a8')
    for (const c of ['#c88a05', '#1fb39c', '#d9443f', '#8f6fd0', '#e07a3f', '#5a7fe0']) {
      const out = fillForWhiteText(c)
      expect(out).not.toBe(c)
      expect(contrast(out, '#ffffff')).toBeGreaterThanOrEqual(4.5)
      expect(contrast(out, '#ffffff')).toBeLessThan(4.9)
    }
    expect(contrast(fillForWhiteText('#c88a05', 6.5), '#ffffff')).toBeGreaterThanOrEqual(6.5)
  })
})
