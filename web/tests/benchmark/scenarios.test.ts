import { BENCH_GROUPS, RULE_IDS, SCENARIOS, ruleCoverage } from '@/features/testcase/bench'

test('the set is large, uniquely named and every group is used', () => {
  expect(SCENARIOS.length).toBeGreaterThanOrEqual(120)
  expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length)
  for (const g of BENCH_GROUPS) expect(SCENARIOS.filter((s) => s.group === g).length).toBeGreaterThan(4)
})

test('every rule R1 to R12, P1 to P9, F1 and F2 has a case that should fire it and a case that must not', () => {
  for (const c of ruleCoverage(SCENARIOS)) {
    expect(c.positives, `${c.rule} positives`).toBeGreaterThan(0)
    expect(c.negatives, `${c.rule} negatives`).toBeGreaterThan(0)
  }
  expect(RULE_IDS).toHaveLength(23)
})

test('every barrier reaches its enabler, on two cases', () => {
  for (const b of ['awareness', 'access', 'trust', 'value', 'forgot', 'decline']) {
    expect(SCENARIOS.filter((s) => s.id.startsWith('V-bar-') && s.id.endsWith('-' + b)).length).toBeGreaterThanOrEqual(2)
  }
})

test('tough cases, both languages, day and night and every age band are present', () => {
  const tags = (k: 'lang' | 'time' | 'age' | 'level') => new Set(SCENARIOS.map((s) => s.tags[k]))
  expect(tags('lang')).toEqual(new Set(['en', 'ar']))
  expect(tags('time')).toEqual(new Set(['day', 'night']))
  expect(tags('age')).toEqual(new Set(['child', '18-39', '40-64', '65+']))
  expect(tags('level')).toEqual(new Set(['easy', 'tough']))
  expect(SCENARIOS.filter((s) => s.tags.level === 'tough').length).toBeGreaterThanOrEqual(30)
  expect(SCENARIOS.filter((s) => s.expected.decision === 'refused').length).toBeGreaterThanOrEqual(15)
})

test('the "998 now" question has plenty of both answers', () => {
  const safety = SCENARIOS.filter((s) => s.setup.kind === 'safety' && s.expected.decision !== 'refused')
  expect(safety.filter((s) => s.expected.decision === 'call-998').length).toBeGreaterThanOrEqual(30)
  expect(safety.filter((s) => s.expected.decision !== 'call-998').length).toBeGreaterThanOrEqual(30)
})
