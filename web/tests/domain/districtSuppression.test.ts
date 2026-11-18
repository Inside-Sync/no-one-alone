import { areaMetricHidden, openPastTarget } from '@/domain/district'
import type { Area } from '@/data/government.types'

const mk = (name: string, actionable: number, reached: number): Area => ({ name, col: 0, row: 0, screened: 500, actionable, reached, coverage: 50, days: 20, language: 'x' })

test('visible columns plus the page total never reveal a hidden area', () => {
  // open counts: 200, 90, 40, 5 (hidden), 12, 30
  const areas = [mk('a', 250, 20), mk('b', 100, 10), mk('c', 50, 20), mk('d', 5, 0), mk('e', 15, 20), mk('f', 40, 25)]
  const open = areas.map(openPastTarget)
  const total = open.reduce((x, y) => x + y, 0)
  const hidden = areaMetricHidden(areas, 'open')
  expect(hidden[3]).toBe(true)
  expect(hidden.filter(Boolean).length).toBeGreaterThanOrEqual(2)
  const visibleSum = open.filter((_, i) => !hidden[i]).reduce((x, y) => x + y, 0)
  const remainder = total - visibleSum
  // The remainder is the sum of 2+ hidden cells, so it never equals a single hidden cell that is itself under 10.
  expect(hidden.filter(Boolean).length).toBeGreaterThan(1)
  expect(remainder).toBe(open.filter((_, i) => hidden[i]).reduce((x, y) => x + y, 0))
})

test('rate measures stay hidden only for small groups', () => {
  const areas = [mk('a', 250, 20), mk('b', 5, 20)]
  expect(areaMetricHidden(areas, 'reach')).toEqual([false, true])
})
