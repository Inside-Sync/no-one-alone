import { act, render } from '@testing-library/react'
import { runAutoStep } from '@/features/testcase/engine/autopilot'
import type { StepKindName, TestCaseEngine } from '@/features/testcase/engine'
import { KindHost, SafetyHarness } from './safetyHarness'

/** Render the card of the engine's current step (re-renders on every engine change). */
export function renderKind(engine: TestCaseEngine) {
  return render(<div className="tc"><KindHost engine={engine} /></div>)
}
export function renderHarness(engine: TestCaseEngine) {
  return render(<div className="tc"><SafetyHarness engine={engine} /></div>)
}

/** Do what "Run it for me" does until the engine stands at an unfinished step of `kind` (after step 0). */
export function advanceTo(engine: TestCaseEngine, kind: StepKindName, maxTicks = 400): void {
  for (let n = 0; n < maxTicks; n++) {
    engine.drain()
    if (engine.cur().kind === kind && engine.S.step > 0 && !engine.S.done[engine.S.step]) return
    if (runAutoStep(engine)) break
  }
  throw new Error(`never reached ${kind}`)
}

/** Run an engine action inside `act` and let the animations finish, so mounted components see every change. */
export function drive(engine: TestCaseEngine) {
  return (fn: () => void) => act(() => { fn(); engine.drain() })
}
