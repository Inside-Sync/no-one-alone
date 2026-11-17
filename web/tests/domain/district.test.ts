import { districtModel, longestOpenFirst, metricFor, openPastTarget, HIGHER_IS_BETTER, type DistrictModel } from '@/domain/district'
import { areaColumn, areaGeoRing, areaTile, DISTRICT_SIZE } from '@/domain/areaGeometry'
import type { Area, StalledResult } from '@/data/government.types'

const area: Area = { name: 'Mussafah', col: 0, row: 2, screened: 2280, actionable: 412, reached: 58, coverage: 52, days: 34, language: 'Bengali' }

test('model titles', () => expect(districtModel('reach').title).toBe('Reached care in time'))

test('model copy comes from the design', () => {
  expect(districtModel('open')).toEqual({
    title: 'Results open past target',
    subtitle: 'Column height = actionable results not yet in care · tile colour = share reached in time',
    unit: ' open',
  })
  expect(districtModel('cov').title).toBe('Screening coverage')
  expect(districtModel('days').subtitle).toBe('Median days · taller is slower')
  expect(districtModel('days').unit).toBe(' d')
})

test('metricFor follows subVal', () => {
  const m = (k: DistrictModel) => metricFor(area, k)
  expect(m('open')).toBe(173)
  expect(m('reach')).toBe(58)
  expect(m('cov')).toBe(52)
  expect(m('days')).toBe(34)
  expect(openPastTarget({ ...area, reached: 100 })).toBe(0)
})

test('a tall column is good for reached care and coverage only', () => {
  expect(HIGHER_IS_BETTER).toEqual({ open: false, reach: true, cov: true, days: false })
})

test('longestOpenFirst orders by days open, keeping the given order for ties', () => {
  const r = (name: string, openDays: number) => ({ name, openDays }) as StalledResult
  expect(longestOpenFirst([r('a', 9), r('b', 41), r('c', 9), r('d', 33)]).map((x) => x.name)).toEqual(['b', 'd', 'a', 'c'])
})

test('area footprints sit on the plate, one cell apart, and the column stands inside its tile', () => {
  const a = { col: 0, row: 0 }, b = { col: 1, row: 0 }
  for (const [x, y] of [...areaTile(a), ...areaTile({ col: 4, row: 3 })]) {
    expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(DISTRICT_SIZE[0])
    expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(DISTRICT_SIZE[1])
  }
  const [t0, t1] = [areaTile(a), areaTile(b)]
  expect(t1[0][0]).toBeGreaterThan(t0[1][0])
  const col = areaColumn(a), tile = areaTile(a)
  expect(Math.min(...col.map((p) => p[0]))).toBeGreaterThan(Math.min(...tile.map((p) => p[0])))
  expect(Math.max(...col.map((p) => p[1]))).toBeLessThan(Math.max(...tile.map((p) => p[1])))
  const geo = areaGeoRing(a)
  expect(geo[0][0]).toBeGreaterThan(54); expect(geo[0][1]).toBeGreaterThan(24)
})
