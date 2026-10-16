import { ringPattern } from '@/features/individual/live/ring'

const total = (p: { ms: number }[]) => p.reduce((a, x) => a + x.ms, 0)

test('ringPattern(4000): 400 on, 200 off, 400 on, 2000 off, then the next ring, total 4000', () => {
  const p = ringPattern(4000)
  expect(p.slice(0, 4)).toEqual([{ on: true, ms: 400 }, { on: false, ms: 200 }, { on: true, ms: 400 }, { on: false, ms: 2000 }])
  expect(total(p)).toBe(4000)
})

test('the last segment is cut at totalMs', () => {
  const p = ringPattern(3500)
  expect(total(p)).toBe(3500)
  expect(p[p.length - 1]).toEqual({ on: false, ms: 100 })
})
