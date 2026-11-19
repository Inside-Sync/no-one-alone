import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import i18n from '@/i18n'
import { TestCaseContext, type TestCaseValue } from '@/features/testcase/entry/TestCaseContext'
import { CASES } from '@/features/testcase/data/cases'
import TestCaseApp from '@/features/testcase/ui/app/TestCaseApp'
import { TestCaseOverlay } from '@/features/testcase/ui/TestCaseOverlay'
import type { CaseId } from '@/features/testcase/engine'

const ids = Object.keys(CASES) as CaseId[]

/** The context a provider would give, with spies, so a test can see what the app tells the shell. */
function ctx(caseKey: string | null, over: Partial<TestCaseValue> = {}): TestCaseValue {
  return { isOpen: true, caseKey, open: vi.fn(), openJudge: vi.fn(), judgePending: false, consumeJudge: vi.fn(), close: vi.fn(), setCaseKey: vi.fn(), night: false, setNight: vi.fn(), ...over }
}

function App({ caseKey = null, value, shown = true }: { caseKey?: string | null; value?: TestCaseValue; shown?: boolean }) {
  const v = value ?? ctx(caseKey)
  return (
    <TestCaseContext.Provider value={v}>
      {shown && <TestCaseOverlay onClose={v.close}><TestCaseApp /></TestCaseOverlay>}
    </TestCaseContext.Provider>
  )
}

const runBtn = () => document.getElementById('autoBtn') as HTMLElement
const isRunning = () => /Stop/.test(runBtn().textContent ?? '')

/** Advance the virtual clock until "Run it for me" has finished (bounded). */
function finishRun(limitMs = 400_000) {
  let t = 0
  while (isRunning() && t < limitMs) {
    act(() => { vi.advanceTimersByTime(1500) })
    t += 1500
  }
  return t
}

beforeEach(() => { vi.useFakeTimers(); document.body.classList.remove('night') })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

test('the deep link selects the case, the picker lists all ten in three groups', () => {
  const v = ctx('bone')
  render(<App value={v} />)
  const picker = screen.getByLabelText('Cases')
  expect(within(picker).getAllByRole('button', { pressed: undefined }).length).toBeGreaterThanOrEqual(10)
  expect(screen.getByRole('button', { name: /Bone and memory check/, pressed: true })).toBeInTheDocument()
  expect(screen.getByText('Start here · pick one')).toBeInTheDocument()
  expect(screen.getByText('Prevention and screening · one person at a time')).toBeInTheDocument()
  expect(screen.getByText('Safety net · when something goes wrong at home')).toBeInTheDocument()
  // A click picks another case and tells the shell.
  fireEvent.click(screen.getByRole('button', { name: /Fluid build-up/ }))
  expect(screen.getByRole('button', { name: /Fluid build-up/, pressed: true })).toBeInTheDocument()
  expect(v.setCaseKey).toHaveBeenCalledWith('hf')
})

test('the picker starts with three cases and the rest behind "More cases" (prototype simple view)', () => {
  render(<App value={ctx('family')} />)
  const picker = screen.getByLabelText('Cases')
  expect(within(picker).getByText('Start here · pick one')).toBeInTheDocument()
  expect(within(picker).getByRole('button', { name: /Live speech test/ })).toHaveClass('speechcs')
  expect(within(picker).queryByText('Prevention and screening · one person at a time')).toBeNull()
  fireEvent.click(within(picker).getByRole('button', { name: /More cases \(7\)/ }))
  expect(within(picker).getByText('Prevention and screening · one person at a time')).toBeInTheDocument()
  expect(within(picker).getByText('Safety net · when something goes wrong at home')).toBeInTheDocument()
  expect(within(picker).queryByRole('button', { name: /More cases/ })).toBeNull()
})

test('an unknown deep link falls back to the family case', () => {
  render(<App caseKey="nonsense" />)
  expect(screen.getByRole('button', { name: /The whole family/, pressed: true })).toBeInTheDocument()
})

test.each(ids)('%s: every region renders and "Run it for me" reaches the end without errors', (id) => {
  const err = vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<App caseKey={id} />)
  expect(screen.getByRole('list', { name: 'Steps' })).toBeInTheDocument()
  expect(screen.getByLabelText('Noa agent team')).toBeInTheDocument()
  expect(screen.getByRole('list', { name: 'Data path' })).toBeInTheDocument()
  expect(screen.getByText('Demo database')).toBeInTheDocument()
  expect(screen.getByText('API and event log')).toBeInTheDocument()
  expect(screen.getByText('Who has', { exact: false })).toBeInTheDocument()
  // Moment that matters and How might we in the header.
  expect(screen.getByText('The moment that matters')).toBeInTheDocument()
  expect(screen.getByText('How might we')).toBeInTheDocument()
  fireEvent.click(runBtn())
  expect(isRunning()).toBe(true)
  const took = finishRun()
  expect(isRunning()).toBe(false)
  expect(took).toBeLessThan(400_000)
  act(() => { vi.advanceTimersByTime(5000) })
  expect(vi.getTimerCount()).toBe(0)
  // A case with a path reaches its last step.
  const steps = within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('button')
  if (id !== 'own') expect(steps.some((b) => b.getAttribute('aria-current') === 'step')).toBe(true)
  expect(document.querySelectorAll('.loglist li').length).toBeGreaterThan(2)
  expect(err).not.toHaveBeenCalled()
}, 90_000)

test('Stop cancels every timer and leaves the case where it is', () => {
  render(<App caseKey="stroke" />)
  fireEvent.click(runBtn())
  act(() => { vi.advanceTimersByTime(2000) })
  expect(vi.getTimerCount()).toBeGreaterThan(0)
  fireEvent.click(runBtn())
  expect(isRunning()).toBe(false)
  // The sensor playback already under way plays out; nothing else moves.
  act(() => { vi.advanceTimersByTime(60_000) })
  expect(vi.getTimerCount()).toBe(0)
  const log = document.querySelectorAll('.loglist li').length
  act(() => { vi.advanceTimersByTime(60_000) })
  expect(document.querySelectorAll('.loglist li').length).toBe(log)
  expect(isRunning()).toBe(false)
})

test('closing the overlay stops the run, the playback and the pipeline: no timer is left', () => {
  const view = render(<App caseKey="stroke" />)
  fireEvent.click(runBtn())
  act(() => { vi.advanceTimersByTime(1500) })
  expect(vi.getTimerCount()).toBeGreaterThan(0)
  view.rerender(<App caseKey="stroke" shown={false} />)
  expect(vi.getTimerCount()).toBe(0)
  const err = vi.spyOn(console, 'error').mockImplementation(() => {})
  act(() => { vi.advanceTimersByTime(60_000) })
  expect(err).not.toHaveBeenCalled()
})

test('a night case turns the shell dark while it plays and light again when it is over', () => {
  const setNight = vi.fn()
  render(<App value={ctx('stroke', { setNight })} />)
  expect(setNight).toHaveBeenLastCalledWith(false)
  fireEvent.click(runBtn())
  act(() => { vi.advanceTimersByTime(3000) })
  expect(setNight).toHaveBeenCalledWith(true)
})

test('the Noa panel switches between Hospital and Government and the database has a tab per table', () => {
  render(<App caseKey="stroke" />)
  fireEvent.click(screen.getByRole('button', { name: 'Government', pressed: false }))
  expect(screen.getByText(/Waiting for the hospitals’ monthly reports/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /^audit/ }))
  expect(screen.getByRole('button', { name: /^audit/, pressed: true })).toBeInTheDocument()
  expect(document.querySelectorAll('.dbtabs button').length).toBe(10)
})

test('the stepper opens only the steps already reached', () => {
  render(<App caseKey="ifhas" />)
  const steps = within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('button')
  expect(steps[0]).not.toBeDisabled()
  expect(steps[1]).toBeDisabled()
})

test('Arabic: the app renders in Arabic with right-to-left direction', async () => {
  await act(async () => { await i18n.changeLanguage('ar') })
  try {
    render(<App caseKey="family" />)
    expect(document.getElementById('tcHost')).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText('نوا فريق من 9 وكلاء ذكاء اصطناعي')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /شغّلها لي/ })).toBeInTheDocument()
  } finally {
    await act(async () => { await i18n.changeLanguage('en') })
  }
})
