import en from '@/locales/en/testcase.json'
import { TestCaseEngine, resolveText, runAutopilot, type CaseId, type TFn, type Txt } from '@/features/testcase/engine'

/** A `t` for the testcase namespace straight from the English JSON (no i18next: the engine resolves placeholders itself). */
export const t: TFn = (key) => {
  const v = key.split('.').reduce<unknown>((o, s) => (o == null ? o : (o as Record<string, unknown>)[s]), en)
  return typeof v === 'string' ? v : key
}

export const make = (caseId: CaseId = 'family') => new TestCaseEngine({ t, caseId })
/** Resolve a Txt (or string) with the engine's token context. */
export const text = (e: TestCaseEngine, x: Txt | string | number | null | undefined) => resolveText(x, t, e.ctx())
/** Run "Run it for me" to the end. */
export const auto = (caseId: CaseId) => {
  const e = make(caseId)
  const ticks = runAutopilot(e)
  return { e, ticks }
}
/** The titles of the steps of a case, resolved. */
export const stepTitles = (e: TestCaseEngine) => e.steps().map((s) => text(e, { k: s.title }))
