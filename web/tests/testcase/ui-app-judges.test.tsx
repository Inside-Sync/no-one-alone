import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import i18n from '@/i18n'
import { TestCaseContext, type TestCaseValue } from '@/features/testcase/entry/TestCaseContext'
import { TestCaseEngine, type CaseId, type TFn } from '@/features/testcase/engine'
import { Driver, JUDGE_BEATS, type JudgeState } from '@/features/testcase/ui/app/driver'
import TestCaseApp from '@/features/testcase/ui/app/TestCaseApp'
import { TestCaseOverlay } from '@/features/testcase/ui/TestCaseOverlay'
import { computeKpis, pooledKpis } from '@/features/testcase/ui/judges/kpis'

const tt = () => i18n.getFixedT('en', 'testcase') as unknown as TFn
const ctx = (caseKey: string): TestCaseValue => ({ isOpen: true, caseKey, open: vi.fn(), close: vi.fn(), setCaseKey: vi.fn(), night: false, setNight: vi.fn() })
const App = ({ caseKey }: { caseKey: string }) => (
  <TestCaseContext.Provider value={ctx(caseKey)}><TestCaseOverlay onClose={() => {}}><TestCaseApp /></TestCaseOverlay></TestCaseContext.Provider>
)

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

test('KPIs of a finished run are computed from the engine, and pooled over ten cases', () => {
  const e = new TestCaseEngine({ caseId: 'ifhas', t: tt() })
  e.setAuto(true)
  e.drain()
  for (let i = 0; i < 200 && e.autoStep() != null; i++) e.drain()
  const k = computeKpis(e)
  expect(k.screened).toEqual({ state: 'ready', a: 1, b: 1 })
  expect(k.days.state).toBe('ready')
  expect(k.barriers).toEqual({ state: 'ready', a: 1, b: 1 })
  const s = new TestCaseEngine({ caseId: 'stroke', t: tt() })
  s.setAuto(true)
  for (let i = 0; i < 400 && s.autoStep() != null; i++) s.drain()
  expect(computeKpis(s).to998.state).toBe('ready')
  const pool = pooledKpis(tt())
  expect(pool.to998.n).toBeGreaterThan(0)
  expect(pool.screened.n).toBeGreaterThan(0)
})

test('the For judges tab shows the KPIs of the run, the six questions, the pilot and the rules', () => {
  render(<App caseKey="ifhas" />)
  fireEvent.click(document.getElementById('autoBtn')!)
  for (let i = 0; i < 400 && /Stop/.test(document.getElementById('autoBtn')!.textContent ?? ''); i++) act(() => { vi.advanceTimersByTime(1500) })
  fireEvent.click(screen.getByRole('tab', { name: 'For judges' }))
  expect(screen.getByText('Rising-risk people who completed screening')).toBeInTheDocument()
  expect(screen.getAllByText('1 of 1 · 100%').length).toBeGreaterThan(0)
  expect(screen.getByText('What if Noa is wrong?')).toBeInTheDocument()
  expect(screen.getByText(/About 300 families overdue or never screened/)).toBeInTheDocument()
  expect(screen.getByText('Read every rule Noa applies')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Run all ten cases and pool the numbers' }))
  expect(screen.getAllByText('All ten cases').length).toBeGreaterThan(0)
  // A question link jumps to the case tab.
  fireEvent.click(screen.getByRole('button', { name: /See the whole family/ }))
  expect(screen.getByRole('button', { name: /The whole family/, pressed: true })).toBeInTheDocument()
}, 30_000)

test('the Judge path chains Khalid, the family and the stroke, then stops all timers', () => {
  const e = new TestCaseEngine({ caseId: 'wellchild', t: tt() })
  const seen: CaseId[] = []
  const states: (JudgeState | null)[] = []
  const d = new Driver(e, { reduced: false, onJudge: (s) => states.push(s) })
  const unsub = e.subscribe(() => { if (seen[seen.length - 1] !== e.S.ck) seen.push(e.S.ck) })
  d.startJudge()
  let ms = 0
  while (d.judging?.phase !== 'done' && ms < 900_000) { vi.advanceTimersByTime(250); ms += 250 }
  expect(seen).toEqual([...JUDGE_BEATS])
  expect(d.judging?.phase).toBe('done')
  expect(ms).toBeGreaterThan(90_000)
  expect(ms).toBeLessThan(300_000)
  expect(vi.getTimerCount()).toBe(0)
  unsub()
  d.dispose()
})

test('Driver.stop and dispose cancel everything', () => {
  const e = new TestCaseEngine({ caseId: 'stroke', t: tt() })
  const d = new Driver(e, { reduced: false })
  e.setAuto(true)
  vi.advanceTimersByTime(1500)
  expect(vi.getTimerCount()).toBeGreaterThan(0)
  d.dispose()
  expect(vi.getTimerCount()).toBe(0)
})

test('reduced motion runs the case without waiting', () => {
  const e = new TestCaseEngine({ caseId: 'hf', t: tt() })
  const d = new Driver(e, { reduced: true })
  e.setAuto(true)
  vi.advanceTimersByTime(20_000)
  expect(e.S.auto).toBe(false)
  expect(vi.getTimerCount()).toBe(0)
  d.dispose()
})
