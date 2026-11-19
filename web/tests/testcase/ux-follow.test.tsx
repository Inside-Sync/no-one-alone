import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { TestCaseContext, type TestCaseValue } from '@/features/testcase/entry/TestCaseContext'
import TestCaseApp from '@/features/testcase/ui/app/TestCaseApp'
import { TOAST_MS } from '@/features/testcase/ui/app/toast'
import { TestCaseOverlay } from '@/features/testcase/ui/TestCaseOverlay'

function ctx(caseKey: string | null): TestCaseValue {
  return { isOpen: true, caseKey, open: vi.fn(), openJudge: vi.fn(), judgePending: false, consumeJudge: vi.fn(), close: vi.fn(), setCaseKey: vi.fn(), night: false, setNight: vi.fn() }
}
function App({ caseKey }: { caseKey: string }) {
  const v = ctx(caseKey)
  return <TestCaseContext.Provider value={v}><TestCaseOverlay onClose={v.close}><TestCaseApp /></TestCaseOverlay></TestCaseContext.Provider>
}

let scrollTo: ReturnType<typeof vi.fn>
beforeEach(() => {
  vi.useFakeTimers()
  // The app default is the slow, presenting pace; these tests count timer ticks at the normal one.
  try { window.localStorage.setItem('noa-tc-speed', 'normal') } catch { /* none */ }
  scrollTo = vi.fn()
  HTMLElement.prototype.scrollTo = scrollTo as unknown as HTMLElement['scrollTo']
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo })

const status = () => document.querySelector('.tc-toast-host')!
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

test('Restart and the language switch show one toast that hides itself', () => {
  render(<App caseKey="stroke" />)
  fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
  expect(status()).toHaveTextContent('Case reset to its starting details')
  tick(1)
  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  fireEvent.click(document.querySelector('.langsw button[lang="ar"]')!)
  // The second message replaces the first: one toast, not a stack.
  expect(status().querySelectorAll('.tc-toast')).toHaveLength(1)
  expect(status()).toHaveTextContent('Noa will speak Arabic in the speech check and teach-back')
  tick(TOAST_MS - 100)
  expect(status().querySelectorAll('.tc-toast')).toHaveLength(1)
  tick(200)
  expect(status().querySelectorAll('.tc-toast')).toHaveLength(0)
  expect(status()).toHaveAttribute('role', 'status')
  expect(status()).toHaveAttribute('aria-live', 'polite')
})

test('the language switch says nothing when the language does not change', () => {
  render(<App caseKey="stroke" />)
  fireEvent.click(document.querySelector('.langsw button[lang="en"]')!)
  expect(status().querySelectorAll('.tc-toast')).toHaveLength(0)
})

test('Run it for me follows the step card until the person scrolls by hand', () => {
  render(<App caseKey="stroke" />)
  const host = document.getElementById('tcHost')!
  scrollTo.mockClear()
  fireEvent.click(document.getElementById('autoBtn')!)
  tick(1)
  expect(scrollTo).toHaveBeenCalledTimes(1)
  // Steps change while it runs: the screen follows.
  let guard = 0
  while (scrollTo.mock.calls.length < 3 && guard++ < 200) tick(500)
  expect(scrollTo.mock.calls.length).toBeGreaterThanOrEqual(3)
  // A wheel turn ends the following.
  fireEvent.wheel(host)
  const n = scrollTo.mock.calls.length
  guard = 0
  const stepNow = () => document.querySelector('ol.stepper [aria-current="step"]')?.textContent
  const s0 = stepNow()
  while (stepNow() === s0 && guard++ < 400) tick(500)
  expect(stepNow()).not.toBe(s0)
  expect(scrollTo.mock.calls.length).toBe(n)
})

test('Replay with the same readings goes to the first step card with a toast', () => {
  render(<App caseKey="stroke" />)
  fireEvent.click(document.getElementById('autoBtn')!)
  let guard = 0
  while (/Stop/.test(document.getElementById('autoBtn')!.textContent ?? '') && guard++ < 400) tick(1500)
  scrollTo.mockClear()
  fireEvent.click(screen.getByRole('button', { name: 'Replay with the same readings' }))
  expect(status()).toHaveTextContent('Running again with the same details')
  tick(1)
  expect(scrollTo).toHaveBeenCalledTimes(1)
})
