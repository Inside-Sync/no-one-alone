import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveText, tx, type TestCaseEngine } from '@/features/testcase/engine'
import { TestCaseLayout } from '@/features/testcase/ui/TestCaseLayout'
import type { Resolve } from '@/features/testcase/ui/kinds/types'
import { safetyKinds, safetyScreens } from '@/features/testcase/ui/kinds/safety'

/** Subscribe to an engine and keep its translator and the pipeline animation going (what the app does around the kinds). */
export function useEngine(engine: TestCaseEngine) {
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const { i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'en'
  const tt = useMemo(() => i18n.getFixedT(lng, 'testcase') as unknown as (k: string, o?: Record<string, unknown>) => string, [i18n, lng])
  useEffect(() => { engine.setTranslator(tt) }, [engine, tt])
  useEffect(() => {
    if (!snap.busy) return
    const id = setInterval(() => { if (!engine.flowTick()) clearInterval(id) }, 220)
    return () => clearInterval(id)
  }, [engine, snap.busy])
  const r: Resolve = (x) => resolveText(x, tt, engine.ctx())
  return { snap, r }
}

/** One step card: the kind that renders the current step, as the app's step card does (kind only, no title or nav). */
export function KindHost({ engine }: { engine: TestCaseEngine }) {
  const { snap, r } = useEngine(engine)
  const Kind = safetyKinds[snap.step.kind]
  return Kind ? <Kind engine={engine} snap={snap} step={snap.step} r={r} /> : null
}

/**
 * A small page for the safety cases: step card, phone and family web app in the shared layout. For development, tests and
 * screenshots only (the app's TestCaseApp does the real composition); open `harness.html` through Vite.
 */
export function SafetyHarness({ engine }: { engine: TestCaseEngine }) {
  const { snap, r } = useEngine(engine)
  const Kind = safetyKinds[snap.step.kind]
  const { Phone, Web } = safetyScreens
  const S = snap.state
  return (
    <TestCaseLayout
      stepper={(
        <ol className="stepper">
          {snap.steps.map((s, i) => (
            <li key={i}><button type="button" aria-current={i === S.step ? 'step' : undefined} disabled={i > S.max} onClick={() => engine.go(i)}><span className="n">{i + 1}</span><span className="t">{r(tx(s.label))}</span></button></li>
          ))}
        </ol>
      )}
      card={(
        <>
          <h3>{S.step + 1} · {r(tx(snap.step.title))}</h3>
          {S.step > 0 && snap.step.text && <p>{r(tx(snap.step.text))}</p>}
          {Kind && <Kind engine={engine} snap={snap} step={snap.step} r={r} />}
          <div className="nav">
            {S.step > 0 ? <button type="button" className="btn ghost sm" onClick={() => engine.go(S.step - 1)}>←</button> : <span />}
            {snap.steps[S.step + 1] && <button type="button" className="btn" disabled={!snap.canNext} onClick={() => engine.next()}>{r(tx(snap.steps[S.step + 1].title))} →</button>}
          </div>
        </>
      )}
      phone={<Phone engine={engine} snap={snap} r={r} />}
      web={<Web engine={engine} snap={snap} r={r} />}
    />
  )
}
