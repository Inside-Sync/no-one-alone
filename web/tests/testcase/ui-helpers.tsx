import { act, render } from '@testing-library/react'
import { useCallback, useSyncExternalStore, type ComponentType } from 'react'
import i18n from '@/i18n'
import { TestCaseEngine, resolveText, type CaseId, type StepKindName, type TFn, type Txt } from '@/features/testcase/engine'
import type { KindProps, KindRegistry, ScreenProps, ScreenSet } from '@/features/testcase/ui/kinds/types'

/** The testcase-namespace translator in the language of the test (English unless a test switches). */
export const tcT = () => i18n.getFixedT(null, 'testcase') as unknown as TFn

export const useEngine = (engine: TestCaseEngine) => {
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const r = useCallback((x: Txt | string | number | null | undefined) => resolveText(x, tcT(), engine.ctx()), [engine])
  return { snap, r }
}

interface HarnessProps {
  engine: TestCaseEngine
  kinds?: KindRegistry
  screens?: ScreenSet
  extra?: ComponentType<ScreenProps>
  card?: boolean
}

/** Renders what the app does: the card of the current step, the phone and the web window, with a real engine behind them. */
export function Harness({ engine, kinds, screens, extra: Extra, card = true }: HarnessProps) {
  const { snap, r } = useEngine(engine)
  const Kind = kinds?.[snap.step.kind as StepKindName] as ComponentType<KindProps> | undefined
  const Phone = screens?.Phone
  const Web = screens?.Web
  const sp = { engine, snap, r }
  return (
    <div className="tc">
      {Extra && <div data-testid="extra"><Extra {...sp} /></div>}
      {card && Kind && <div data-testid="card"><Kind {...sp} step={snap.step} /></div>}
      {Phone && <div data-testid="phone"><Phone {...sp} /></div>}
      {Web && <div data-testid="web"><Web {...sp} /></div>}
    </div>
  )
}

export function mount(caseId: CaseId, props: Omit<HarnessProps, 'engine'>) {
  const engine = new TestCaseEngine({ caseId, t: tcT() })
  const view = render(<Harness engine={engine} {...props} />)
  /** Run an engine action the way a handler would, inside act. */
  const run = (fn: () => void) => act(() => { fn() })
  return { engine, run, ...view }
}

/** Do what a person would, step by step, until the step of this kind is current (bounded, never loops forever). */
export function advanceTo(engine: TestCaseEngine, kind: StepKindName) {
  for (let n = 0; n < 60 && engine.cur().kind !== kind; n++) {
    act(() => {
      const S = engine.S, st = engine.cur()
      if (S.step > 0 && !S.done[S.step]) {
        if (st.kind === 'tl') engine.tlNext()
        else if (st.kind === 'btn') engine.btnAct()
      }
      engine.settle()
      if (engine.canNext()) engine.next()
      engine.settle()
    })
  }
  if (engine.cur().kind !== kind) throw new Error(`never reached ${kind}`)
}
