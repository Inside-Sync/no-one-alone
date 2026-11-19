import { act, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { vi } from 'vitest'
import { TestCaseContext, type TestCaseValue } from '@/features/testcase/entry/TestCaseContext'
import TestCaseApp from '@/features/testcase/ui/app/TestCaseApp'
import { TestCaseOverlay } from '@/features/testcase/ui/TestCaseOverlay'

function ctx(caseKey: string | null, over: Partial<TestCaseValue> = {}): TestCaseValue {
  return { isOpen: true, caseKey, open: vi.fn(), openJudge: vi.fn(), judgePending: false, consumeJudge: vi.fn(), close: vi.fn(), setCaseKey: vi.fn(), night: false, setNight: vi.fn(), ...over }
}
function App({ value }: { value: TestCaseValue }) {
  return <TestCaseContext.Provider value={value}><TestCaseOverlay onClose={value.close}><TestCaseApp /></TestCaseOverlay></TestCaseContext.Provider>
}

beforeEach(() => { vi.useFakeTimers(); HTMLElement.prototype.scrollTo = vi.fn() as unknown as HTMLElement['scrollTo'] })
afterEach(() => { vi.useRealTimers(); delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo })

test('the Judge path is the primary first click; Run it for me is the secondary one', () => {
  render(<App value={ctx('family')} />)
  const judge = screen.getByRole('button', { name: /Start here: 3-minute Judge path/ })
  expect(judge).toHaveAttribute('id', 'judgeBtn')
  expect(judge).not.toHaveClass('ghost')
  const auto = screen.getByRole('button', { name: /Run it for me/ })
  expect(auto).toHaveAttribute('id', 'autoBtn')
  expect(auto).toHaveClass('ghost')
})

test('opened from the banner (judgePending), the overlay starts the Judge path once and says so', () => {
  const v = ctx(null, { judgePending: true })
  render(<App value={v} />)
  act(() => { vi.advanceTimersByTime(100) })
  expect(v.consumeJudge).toHaveBeenCalledTimes(1)
  expect(document.querySelector('.tc-judgecap')).not.toBeNull()
  expect(document.querySelector('.tc-judgecap')).toHaveTextContent(/Beat 1/i)
})

test('the sections follow the prototype: header, picker, family dashboard, steps, baton, team, step view, next bar, bottom', () => {
  render(<App value={ctx('family')} />)
  const wrap = document.getElementById('caseHeader')!.parentElement!
  const order = Array.from(wrap.children).filter((e) => !e.classList.contains('sr')).map((e) => e.id || e.className.split(' ')[0])
  expect(order).toEqual(['caseHeader', 'picker', 'famdash', 'stepper', 'baton', 'team', 'casegrid', 'nextbar', 'bottom'])
  const grid = wrap.querySelector('.casegrid')!
  expect(grid.children[0].id).toBe('card')
  expect(grid.children[1].firstElementChild).toHaveClass('pipe')
  expect(grid.children[1].lastElementChild).toHaveClass('screens')
})

test('Next in the bar does the next action of the step and says which one (prototype stepOnce and nextHint)', () => {
  render(<App value={ctx('family')} />)
  const next = () => document.querySelector('#nextbar [data-act="stepnext"]') as HTMLButtonElement
  const why = () => document.getElementById('tc-nextwhy')!.textContent
  expect(next()).toBeEnabled()
  expect(next().getAttribute('aria-describedby')).toBe('tc-nextwhy')
  expect(why()).toMatch(/^Moza: /)
  expect(document.querySelector('#nextbar .lab')).toHaveTextContent(/^Step 1 of \d+ · /)
  const before = why()
  fireEvent.click(next())
  act(() => { vi.advanceTimersByTime(5000) })
  expect(why()).not.toBe(before)
})

test('a safety case: step 1 has no "of N" yet, and Next plays the readings', () => {
  render(<App value={ctx('stroke')} />)
  expect(document.querySelector('#nextbar .lab')).toHaveTextContent(/^Step 1 · /)
  expect(document.getElementById('tc-nextwhy')).toHaveTextContent('Start the night: play the heart-rate readings')
  fireEvent.click(document.querySelector('#nextbar [data-act="stepnext"]')!)
  expect(document.getElementById('tc-nextwhy')).not.toHaveTextContent('Start the night')
})

test('the case opens in the simple view; "Show details" brings the baton, team, data path and bottom', () => {
  render(<App value={ctx('stroke')} />)
  const wrap = document.getElementById('caseHeader')!.parentElement!
  const btn = screen.getByRole('button', { name: 'Show details' })
  expect(wrap).toHaveClass('simple')
  expect(btn).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(btn)
  expect(wrap).not.toHaveClass('simple')
  expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-pressed', 'true')
  const css = readFileSync('src/features/testcase/ui/app/app.css', 'utf8')
  expect(css).toMatch(/\.wrap\.simple :is\(#baton,#team,\.pipe,\.bottom,details\.rules,\.srcwrap,\.lanebox,\.tc-brief\)\{display:none!important\}/)
})

test('the header keeps the "Test case" label from 1024 px up (icon-only below)', () => {
  const css = readFileSync('src/features/testcase/entry/shell.css', 'utf8')
  expect(css).toMatch(/@media \(max-width:1023px\)\{\.tn-right #runTest span\.t\{display:none\}\}/)
  expect(css).not.toMatch(/max-width:1480px\)\{\.tn-right #runTest/)
})

test('the overlay bar is opaque enough and drops its subtitle on a phone', () => {
  const css = readFileSync('src/features/testcase/testcase.css', 'utf8')
  expect(css).toMatch(/--bar-bg:rgba\(250,252,252,\.95\)/)
  expect(css).toMatch(/\.tc\.dark\{--bar-bg:rgba\(14,28,30,\.95\)\}/)
  expect(css).toMatch(/@media \(max-width:640px\)\{\s*\.tc\.tc\.tc \.tc-bar \.src\{display:none\}/)
})

test('the night theme does not carry into For judges and Benchmark', () => {
  const { rerender } = render(<TestCaseOverlay onClose={() => {}} night tab="case"><p>x</p></TestCaseOverlay>)
  expect(document.getElementById('tcHost')).toHaveClass('dark')
  rerender(<TestCaseOverlay onClose={() => {}} night tab="judges"><p>x</p></TestCaseOverlay>)
  expect(document.getElementById('tcHost')).not.toHaveClass('dark')
  rerender(<TestCaseOverlay onClose={() => {}} night tab="bench"><p>x</p></TestCaseOverlay>)
  expect(document.getElementById('tcHost')).not.toHaveClass('dark')
})
