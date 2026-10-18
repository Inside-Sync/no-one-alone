import { districtModel, metricFor, rankVisits, type DistrictModel } from '@/domain/district'
import type { PillTone, Suburb, VisitRow } from '@/data/types'

const sub: Suburb = { name: 'Tempe', col: 2, row: 0, enrolled: 58, alonePct: 42, highRisk: 9, heat: 0.86, volunteers: 1, language: 'Vietnamese' }

test('model titles', () => expect(districtModel('gap').title).toBe('Visit gap'))

test('model copy is verbatim from DM', () => {
  expect(districtModel('high')).toEqual({ title: 'High-risk residents', subtitle: 'Suburb height and colour = people at high risk', unit: ' high risk' })
  expect(districtModel('alone').unit).toBe(' % alone')
  expect(districtModel('heat').subtitle).toBe('Index from age, air-con, tree cover and housing')
  expect(districtModel('gap').unit).toBe(' visits short')
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
  const v = (name: string, risk: string, tone: PillTone) => ({ name, risk, tone }) as VisitRow
  const out = rankVisits([v('a', 'Watch', 'plain'), v('b', 'High', 'bad'), v('c', 'Medium', 'warn'), v('d', 'High', 'bad')])
  expect(out.map((r) => r.name)).toEqual(['b', 'd', 'c', 'a'])
})

test('rankVisits ranks by tone, so translated risk text still sorts', () => {
  const v = (name: string, risk: string, tone: PillTone) => ({ name, risk, tone }) as VisitRow
  const out = rankVisits([v('a', 'Theo dõi', 'plain'), v('b', 'Trung bình', 'warn'), v('c', 'Cao', 'bad')])
  expect(out.map((r) => r.name)).toEqual(['c', 'b', 'a'])
})
