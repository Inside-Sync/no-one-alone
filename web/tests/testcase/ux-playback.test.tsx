import { act, fireEvent, render } from '@testing-library/react'
import { vi } from 'vitest'
import { TestCaseContext, type TestCaseValue } from '@/features/testcase/entry/TestCaseContext'
import TestCaseApp from '@/features/testcase/ui/app/TestCaseApp'
import { TestCaseOverlay } from '@/features/testcase/ui/TestCaseOverlay'

function ctx(caseKey: string | null): TestCaseValue {
  return { isOpen: true, caseKey, open: vi.fn(), openJudge: vi.fn(), judgePending: false, consumeJudge: vi.fn(), close: vi.fn(), setCaseKey: vi.fn(), night: false, setNight: vi.fn() }
}
function App({ caseKey }: { caseKey: string }) {
  const v = ctx(caseKey)
  return <TestCaseContext.Provider value={v}><TestCaseOverlay onClose={v.close}><TestCaseApp /></TestCaseOverlay></TestCaseContext.Provider>
}

beforeEach(() => { vi.useFakeTimers(); HTMLElement.prototype.scrollTo = vi.fn() as unknown as HTMLElement['scrollTo']; try { window.localStorage.removeItem('noa-tc-speed') } catch { /* none */ } })
afterEach(() => { vi.useRealTimers(); delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo })
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const stepNow = () => document.querySelector('ol.stepper [aria-current="step"]')?.textContent

test('the controls are hidden until a run starts; then Pause, Back, Skip, speed and progress show', () => {
  render(<App caseKey="stroke" />)
  expect(document.getElementById('tcPlayback')).toBeNull()
  fireEvent.click(document.getElementById('judgeBtn')!)
  const bar = document.getElementById('tcPlayback')!
  expect(bar).toBeTruthy()
  expect(bar).toHaveTextContent('Step 1 of')
  expect(bar).toHaveTextContent('Case 1 of 3')
  for (const id of ['pbPause', 'pbBack', 'pbSkip']) expect(document.getElementById(id)!.getAttribute('aria-label')).toBeTruthy()
  expect(bar.querySelectorAll('[data-speed]')).toHaveLength(3)
})

test('Pause freezes the step, Space resumes it, speed is remembered', () => {
  render(<App caseKey="stroke" />)
  fireEvent.click(document.getElementById('autoBtn')!)
  tick(3000)
  const pause = document.getElementById('pbPause')!
  expect(pause).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(pause)
  expect(document.getElementById('pbPause')).toHaveAttribute('aria-pressed', 'true')
  const s0 = stepNow()
  tick(120_000)
  expect(stepNow()).toBe(s0)
  fireEvent.keyDown(document.body, { key: ' ' })
  expect(document.getElementById('pbPause')).toHaveAttribute('aria-pressed', 'false')
  // Space on a field or a button is not ours.
  fireEvent.keyDown(document.getElementById('pbSkip')!, { key: ' ' })
  expect(document.getElementById('pbPause')).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(document.querySelector('[data-speed="fast"]')!)
  expect(window.localStorage.getItem('noa-tc-speed')).toBe('fast')
  expect(document.querySelector('[data-speed="fast"]')).toHaveAttribute('aria-pressed', 'true')
})

test('Skip goes to the next step and Back returns to the one before', () => {
  render(<App caseKey="family" />)
  fireEvent.click(document.getElementById('autoBtn')!)
  fireEvent.click(document.getElementById('pbPause')!)
  fireEvent.click(document.getElementById('pbSkip')!)
  expect(stepNow()).toMatch(/^2 ·/)
  fireEvent.click(document.getElementById('pbSkip')!)
  expect(stepNow()).toMatch(/^3 ·/)
  fireEvent.click(document.getElementById('pbBack')!)
  expect(stepNow()).toMatch(/^2 ·/)
  expect(document.getElementById('pbPause')).toHaveAttribute('aria-pressed', 'true')
})
