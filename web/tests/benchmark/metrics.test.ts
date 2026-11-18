import { computeMetrics, confusion, criticalMetrics, ruleCoverage, wilson, pct, SCENARIOS, type Outcome, type Scenario, type ScenarioResult } from '@/features/testcase/bench'

const near = (a: number, b: number, d = 1e-3) => expect(Math.abs(a - b)).toBeLessThan(d)

describe('Wilson 95% interval', () => {
  test('known values', () => {
    const half = wilson(5, 10)
    near(half.p, 0.5); near(half.lo, 0.2366); near(half.hi, 0.7634)
    const all = wilson(46, 46)
    near(all.p, 1); near(all.lo, 0.9229); near(all.hi, 1, 1e-9)
    const none = wilson(0, 10)
    near(none.lo, 0, 1e-9); near(none.hi, 0.2775)
    const one = wilson(1, 1)
    near(one.lo, 0.2065); near(one.hi, 1, 1e-9)
  })
  test('no observations: the whole range, never NaN', () => {
    expect(wilson(0, 0)).toEqual({ n: 0, k: 0, p: 0, lo: 0, hi: 1 })
  })
  test('stays inside 0 to 1, contains p, and narrows as n grows', () => {
    let width = Infinity
    for (const n of [10, 40, 160, 640]) {
      const r = wilson(Math.round(n * 0.9), n)
      expect(r.lo).toBeGreaterThanOrEqual(0)
      expect(r.hi).toBeLessThanOrEqual(1)
      expect(r.lo).toBeLessThanOrEqual(r.p)
      expect(r.hi).toBeGreaterThanOrEqual(r.p)
      expect(r.hi - r.lo).toBeLessThan(width)
      width = r.hi - r.lo
    }
  })
  test('is symmetric around 0.5 for k and n - k', () => {
    const a = wilson(3, 20), b = wilson(17, 20)
    near(a.lo, 1 - b.hi); near(a.hi, 1 - b.lo)
  })
  test('pct formats one decimal', () => {
    expect(pct(1)).toBe('100%')
    expect(pct(0.97647)).toBe('97.6%')
    expect(pct(0)).toBe('0%')
  })
})

const sc = (id: string, decision: Outcome['decision'], kind: 'safety' | 'prev' = 'safety', tags: Partial<Scenario['tags']> = {}): Scenario => ({
  id, group: kind === 'safety' ? 'safety-rules' : 'prevention-rules', title: id,
  setup: kind === 'safety' ? { kind: 'safety' } : { kind: 'prev', pv: 'wellchild' },
  expected: { rule: 'R5', decision, agent: 'noa' },
  tags: { lang: 'en', time: 'night', age: '65+', level: 'easy', ...tags },
})
const res = (s: Scenario, got: Outcome['decision'], pass = s.expected.decision === got): ScenarioResult => ({
  id: s.id, scenario: s, actual: { rule: 'R5', decision: got, agent: 'noa' }, pass, divergence: null,
})

describe('confusion matrix and the critical metrics', () => {
  const list = [
    res(sc('a', 'call-998'), 'call-998'), res(sc('b', 'call-998'), 'call-998'), res(sc('c', 'call-998'), 'home-plan'),
    res(sc('d', 'home-plan'), 'home-plan'), res(sc('e', 'no-action'), 'no-action'), res(sc('f', 'same-day-clinic'), 'call-998'), res(sc('g', 'stand-down'), 'stand-down'),
    res(sc('h', 'refused'), 'refused'),
    res(sc('p', 'refer', 'prev'), 'refer'),
  ]
  test('counts only safety scenarios that reach a decision', () => {
    expect(confusion(list)).toEqual({ tp: 2, fn: 1, fp: 1, tn: 3 })
  })
  test('sensitivity, specificity and their intervals', () => {
    const c = criticalMetrics(list)
    near(c.sensitivity.p, 2 / 3); expect(c.sensitivity.n).toBe(3)
    near(c.specificity.p, 3 / 4); expect(c.specificity.n).toBe(4)
    near(c.ppv.p, 2 / 3); near(c.npv.p, 3 / 4); near(c.accuracy.p, 5 / 7)
    expect(c.sensitivity.lo).toBeLessThan(c.sensitivity.p)
    expect(c.sensitivity.hi).toBeGreaterThan(c.sensitivity.p)
  })
  test('a scenario that stops without a decision counts as "not 998"', () => {
    const miss = res(sc('x', 'call-998'), 'no-decision')
    expect(confusion([miss])).toEqual({ tp: 0, fn: 1, fp: 0, tn: 0 })
  })
  test('an empty run has no NaN', () => {
    const c = criticalMetrics([])
    expect(c.sensitivity.n).toBe(0)
    expect(Number.isNaN(c.sensitivity.p)).toBe(false)
  })
})

describe('computeMetrics', () => {
  test('overall, per group, per subgroup and the failures list', () => {
    const a = sc('a', 'call-998', 'safety', { lang: 'ar', time: 'day', age: 'child', level: 'tough' })
    const b = sc('b', 'home-plan')
    const c = sc('c', 'refer', 'prev')
    const m = computeMetrics([res(a, 'call-998'), res(b, 'call-998'), res(c, 'refer')])
    expect(m.total).toBe(3)
    expect(m.passed).toBe(2)
    expect(m.failures.map((f) => f.id)).toEqual(['b'])
    expect(m.byGroup['safety-rules'].n).toBe(2)
    expect(m.byGroup['safety-rules'].k).toBe(1)
    expect(m.byGroup['prevention-rules'].k).toBe(1)
    expect(m.subgroups.lang.ar.n).toBe(1)
    expect(m.subgroups.lang.en.n).toBe(2)
    expect(m.subgroups.time.day.n).toBe(1)
    expect(m.subgroups.age.child.n).toBe(1)
    expect(m.subgroups.level.tough.n).toBe(1)
    expect(m.criticalBy.lang.ar.confusion).toEqual({ tp: 1, fn: 0, fp: 0, tn: 0 })
    expect(m.criticalBy.lang.en.confusion).toEqual({ tp: 0, fn: 0, fp: 1, tn: 0 })
  })
  test('rule coverage counts firing and holding-back scenarios', () => {
    const cov = Object.fromEntries(ruleCoverage(SCENARIOS).map((r) => [r.rule, r]))
    expect(cov.R1.positives).toBeGreaterThan(0)
    expect(cov.R2.positives).toBeGreaterThan(0)
  })
})
