import { SCENARIOS, computeMetrics, diverge, runAll, runAllSync, runScenario, type Scenario } from '@/features/testcase/bench'

const byId = (id: string): Scenario => SCENARIOS.find((s) => s.id === id)!

/** Differences between the rule table and the engine; must change with the engine. */
const KNOWN: string[] = []

const all = runAllSync(SCENARIOS)

test('every scenario runs without an error and the run is repeatable', () => {
  expect(all.filter((r) => r.divergence?.step === 'error')).toEqual([])
  const again = runAllSync(SCENARIOS)
  expect(again.map((r) => [r.id, r.pass, r.actual])).toEqual(all.map((r) => [r.id, r.pass, r.actual]))
})

test('only the documented differences fail', () => {
  expect(all.filter((r) => !r.pass).map((r) => r.id).sort()).toEqual([...KNOWN].sort())
})

test('"998 now": no missed emergency and no false alarm', () => {
  const m = computeMetrics(all)
  expect(m.critical.confusion.fn).toBe(0)
  expect(m.critical.confusion.fp).toBe(0)
  expect(m.critical.sensitivity.lo).toBeGreaterThan(0.9)
})

test('a safety scenario records the rule, the decision and the agent', () => {
  const r = runScenario(byId('S-R1-slurred'))
  expect(r.pass).toBe(true)
  expect(r.actual).toMatchObject({ trigger: 'R1', rule: 'R5', decision: 'call-998', agent: 'noa', speech: 'red' })
})

test('the guardrail case: a refused value blocks the run, a corrected one drives it', () => {
  expect(runScenario(byId('T-hr-400')).actual).toMatchObject({ decision: 'refused', agent: 'guardrail' })
  expect(runScenario(byId('T-fix-hr')).actual).toMatchObject({ trigger: 'R1', rule: 'R5', decision: 'call-998' })
})

test('on a mismatch the run says which step and which agent diverged', () => {
  const wrongRule = diverge({ trigger: 'R1', rule: 'R5', decision: 'call-998', agent: 'noa' }, { trigger: 'R3', rule: 'R5', decision: 'call-998', agent: 'noa' }, null)
  expect(wrongRule).toMatchObject({ step: 'trigger', agent: 'guardian', expected: 'R1', actual: 'R3' })
  const wrongDecision = diverge({ trigger: 'R1', rule: 'R1', decision: 'stand-down', agent: 'voice' }, { trigger: 'R1', rule: 'R5', decision: 'call-998', agent: 'noa' }, null)
  expect(wrongDecision).toMatchObject({ step: 'decision', agent: 'noa', field: 'decision', expected: 'stand-down', actual: 'call-998' })
  const sc: Scenario = { ...byId('S-R12-baseline'), expected: { rule: 'R5', decision: 'call-998', agent: 'noa', trigger: 'R1' } }
  const r = runScenario(sc)
  expect(r.pass).toBe(false)
  expect(r.divergence).toMatchObject({ step: 'trigger', agent: 'guardian' })
  const guard = runScenario({ ...byId('T-hr-400'), setup: { kind: 'safety', set: [{ key: 'hr', value: 400, expect: 'accept' }] } })
  expect(guard.divergence).toMatchObject({ step: 'input', agent: 'guardrail', expected: 'accepted', actual: 'refused' })
})

test('family and prevention scenarios run on the real flows', () => {
  expect(runScenario(byId('FR-khalid-65')).actual).toMatchObject({ rule: 'P9', decision: 'refer', detail: 'dm' })
  expect(runScenario(byId('RS-bone-25')).actual).toMatchObject({ rule: 'P9', decision: 'refer', detail: 'osteo' })
  expect(runScenario(byId('V-bar-ifhas-decline')).actual).toMatchObject({ rule: 'P8', decision: 'respect-choice' })
  expect(runScenario(byId('FF-amna-high-alert')).actual).toMatchObject({ rule: 'F1', alert: true })
})

test('runAll reports progress and can be cancelled', async () => {
  const seen: number[] = []
  const full = await runAll(SCENARIOS.slice(0, 20), { chunk: 5, onProgress: (d) => seen.push(d) })
  expect(full.cancelled).toBe(false)
  expect(full.results).toHaveLength(20)
  expect(seen).toEqual([5, 10, 15, 20])
  let n = 0
  const cut = await runAll(SCENARIOS, { chunk: 5, isCancelled: () => n++ >= 7 })
  expect(cut.cancelled).toBe(true)
  expect(cut.results).toHaveLength(7)
})
