import { DISTRICT_MODELS, metricFor, rankVisits, type DistrictModel } from '@/domain/district'
import type { Suburb, VisitRow } from '@/data/types'

const sub: Suburb = { name: 'Tempe', col: 2, row: 0, enrolled: 58, alonePct: 42, highRisk: 9, heat: 0.86, volunteers: 1, language: 'Vietnamese' }

test('model titles', () => expect(DISTRICT_MODELS.gap.title).toBe('Visit gap'))

test('model copy is verbatim from DM', () => {
  expect(DISTRICT_MODELS.high).toEqual({ title: 'High-risk residents', subtitle: 'Column height = people at high risk · tile colour = heat vulnerability', unit: ' high risk' })
  expect(DISTRICT_MODELS.alone.unit).toBe(' % alone')
  expect(DISTRICT_MODELS.heat.subtitle).toBe('Index from age, air-con, tree cover and housing')
  expect(DISTRICT_MODELS.gap.unit).toBe(' visits short')
})

test('metricFor follows subVal', () => {
  const m = (k: DistrictModel) => metricFor(sub, k)
  expect(m('high')).toBe(9)
  expect(m('alone')).toBe(42)
  expect(m('heat')).toBe(86)
  expect(m('gap')).toBe(14)
  expect(metricFor({ ...sub, highRisk: 1, volunteers: 5 }, 'gap')).toBe(0)
})

test('rankVisits orders by risk, highest first, keeping the given order within a level', () => {
  const v = (name: string, risk: string) => ({ name, risk }) as VisitRow
  const out = rankVisits([v('a', 'Watch'), v('b', 'High'), v('c', 'Medium'), v('d', 'High')])
  expect(out.map((r) => r.name)).toEqual(['b', 'd', 'c', 'a'])
})
