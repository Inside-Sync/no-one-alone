import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { TestCaseContext, type TestCaseValue } from '@/features/testcase/entry/TestCaseContext'
import TestCaseApp from '@/features/testcase/ui/app/TestCaseApp'
import { TestCaseOverlay } from '@/features/testcase/ui/TestCaseOverlay'

// A first-time viewer: the start cards lead with the person, the step card says what the step means, the stepper shows the branch.

function ctx(caseKey: string): TestCaseValue {
  return { isOpen: true, caseKey, open: vi.fn(), openJudge: vi.fn(), judgePending: false, consumeJudge: vi.fn(), close: vi.fn(), setCaseKey: vi.fn(), night: false, setNight: vi.fn() }
}
const App = ({ caseKey }: { caseKey: string }) => (
  <TestCaseContext.Provider value={ctx(caseKey)}><TestCaseOverlay onClose={() => {}}><TestCaseApp /></TestCaseOverlay></TestCaseContext.Provider>
)
const runBtn = () => document.getElementById('autoBtn') as HTMLElement
function finishRun() {
  for (let t = 0; /Stop/.test(runBtn().textContent ?? '') && t < 400_000; t += 1500) act(() => { vi.advanceTimersByTime(1500) })
}
const card = () => document.getElementById('card') as HTMLElement
const means = () => card().querySelector('.tc-means') as HTMLElement

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

test('the start cards lead with the person: "Start with ...", then the age and the case', () => {
  render(<App caseKey="family" />)
  const picker = screen.getByLabelText('Cases')
  expect(within(picker).getByText('Who should Noa look after?')).toBeInTheDocument()
  const starts = [...picker.querySelectorAll('.tc-startcs')]
  expect(starts.map((b) => b.querySelector('b')?.textContent)).toEqual(['Start with the family', 'Start with Moza', 'Start with Khalid'])
  const moza = within(picker).getByRole('button', { name: /Start with Moza/ })
  expect(moza).toHaveClass('speechcs')
  expect(moza.querySelector('small')?.textContent).toMatch(/^\d+ · Stroke at night · Live speech test$/)
  expect(within(picker).getByRole('button', { name: /Start with the family/, pressed: true })).toBeInTheDocument()
  expect(within(picker).getByRole('button', { name: /More cases \(7\)/ })).toBeInTheDocument()
})

test('"What this means" tops the step card: one plain sentence, said once, with no extra mode chip or "Your turn" line', () => {
  render(<App caseKey="stroke" />)
  // Step 0 has no text of its own: it explains itself by who decides (not the teaser the picker card already shows), and that line
  // leaves the agents block so it is said once.
  const home = 'At home, the agents only decide how to respond. They never diagnose.'
  expect(means()).toHaveTextContent(`What this means ${home}`)
  expect(card().querySelector('.agentblock .decides, .decides')).toBeNull()
  expect(within(card()).getAllByText(home, { exact: false })).toHaveLength(1)
  expect(means()).not.toHaveTextContent('Racing heart while still')
  expect(means().querySelector('.mtag, .tc-mchip, .tc-turn')).toBeNull()
  // It sits above the agents.
  expect(means().compareDocumentPosition(card().querySelector('.agent')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  // While "Run it for me" plays, the box keeps the same sentence: never "Your turn", so its height does not jump.
  fireEvent.click(runBtn())
  act(() => { vi.advanceTimersByTime(3000) })
  expect(means()).toHaveTextContent(`What this means ${home}`)
  expect(means()).not.toHaveTextContent(/your turn/i)
  finishRun()
  // A later step: its own sentence, said once in the card.
  const said = means().textContent!.replace('What this means', '').trim()
  expect(said.length).toBeGreaterThan(10)
  expect([...card().querySelectorAll('p')].filter((p) => p.textContent!.includes(said))).toHaveLength(1)
}, 90_000)

test('the Judge path shows no "Your turn" in the step card while it plays or pauses', () => {
  render(<App caseKey="family" />)
  fireEvent.click(screen.getAllByRole('button', { name: /Judge path/ })[0])
  expect(document.getElementById('tcPlayback')).not.toBeNull()
  for (let t = 0; t < 20_000; t += 1000) {
    act(() => { vi.advanceTimersByTime(1000) })
    expect(means()).not.toHaveTextContent(/your turn/i)
  }
  fireEvent.click(document.getElementById('pbPause')!)
  act(() => { vi.advanceTimersByTime(1000) })
  expect(document.getElementById('tcPlayback')).not.toBeNull()
  expect(means()).not.toHaveTextContent(/your turn/i)
}, 60_000)

test('the stepper dashes the steps ahead and marks where Noa’s journey branches off', () => {
  render(<App caseKey="stroke" />)
  const list = () => screen.getByRole('list', { name: 'Steps' })
  // Before the decision: step 1 and the dashed "Noa decides" placeholder, no branch label yet.
  expect(list().querySelector('.tc-branch')).toBeNull()
  const buttons = within(list()).getAllByRole('button')
  expect(buttons.at(-1)).toHaveClass('tc-ahead')
  expect(buttons.at(-1)).toHaveTextContent('Noa decides the rest')
  fireEvent.click(runBtn())
  finishRun()
  const items = [...list().children]
  expect(items[1]).toHaveClass('tc-branch')
  expect(items[1]).toHaveTextContent('After Noa decides')
  // The label is not a list item for assistive tech: the list has one item per step, and step 2 says the label in its name.
  expect(items[1]).toHaveAttribute('aria-hidden', 'true')
  expect(within(list()).getAllByRole('listitem')).toHaveLength(items.length - 1)
  const step2 = items[2].querySelector('button')!
  expect(step2).toHaveAccessibleName(/^After Noa decides: 2 · /)
  expect(step2.querySelector('.n')?.textContent).toMatch(/^2 · /)
  expect((list() as HTMLElement).style.getPropertyValue('--cols')).toMatch(/^minmax\(0,1fr\) auto repeat\(\d+,minmax\(0,1fr\)\)$/)
}, 90_000)

test('family and prevention cases have no branch label; unreached steps are dashed', () => {
  render(<App caseKey="ifhas" />)
  const list = screen.getByRole('list', { name: 'Steps' })
  expect(list.querySelector('.tc-branch')).toBeNull()
  const steps = within(list).getAllByRole('button')
  expect(steps[1]).toBeDisabled()
  expect(steps[1]).toHaveClass('tc-ahead')
  expect(steps[0]).not.toHaveClass('tc-ahead')
})
