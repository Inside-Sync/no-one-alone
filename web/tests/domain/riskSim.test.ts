import { bpProjection, deltaLabel, simulateRisk } from '@/domain/riskSim'

const base = { adherence: 86, steps: 3240, salt: 1 as const, hearingAids: false }

test('defaults reproduce baseline', () => {
  expect(simulateRisk(base)).toEqual({ stroke: 2.1, fall: 21, admission: 14, mci: 3.1 })
})
test('full adherence gives 1.3%', () =>
  expect(simulateRisk({ ...base, adherence: 100 }).stroke.toFixed(1)).toBe('1.3'))
test('hearing aids', () => {
  const r = simulateRisk({ ...base, hearingAids: true })
  expect(r.fall.toFixed(1)).toBe('18.9')
  expect(r.mci.toFixed(1)).toBe('2.5')
})
test('deltaLabel', () => {
  expect(deltaLabel(2.1, 2.1)).toEqual({ text: 'no change', tone: 'muted' })
  expect(deltaLabel(1.3, 2.1)).toEqual({ text: '−38% relative', tone: 'good' })
  expect(deltaLabel(2.5, 2.1)).toEqual({ text: '+19% relative', tone: 'bad' })
})
const BP = { observed: [128, 131, 133, 137, 140, 146], projectedNothing: [146, 148.5, 151, 153.5, 156], projectedAdherent: [146, 140, 136, 133, 131] }

test('bpProjection', () => {
  expect(bpProjection(BP, 86).observed).toEqual([128, 131, 133, 137, 140, 146])
  expect(bpProjection(BP, 86).projected).toEqual([146, 148.5, 151, 153.5, 156])
  expect(bpProjection(BP, 100).projected).toEqual([146, 140, 136, 133, 131])
  expect(bpProjection(BP, 60).projected).toEqual([146, 151.5, 157, 162.5, 168])
})
