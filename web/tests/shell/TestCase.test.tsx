import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { TestCaseBanner } from '@/features/testcase/entry/TestCaseBanner'
import { TestCaseButton } from '@/features/testcase/entry/TestCaseButton'
import { TestCaseProvider } from '@/features/testcase/entry/TestCaseProvider'
import { useTestCase } from '@/features/testcase/entry/TestCaseContext'
import { TestCaseLayout } from '@/features/testcase/ui/TestCaseLayout'
import { TestCaseOverlay } from '@/features/testcase/ui/TestCaseOverlay'

vi.mock('@/features/testcase/entry/TestCaseBody', () => ({
  default: function Body() {
    const tc = useTestCase()
    return <div data-testid="body" data-case={tc.caseKey ?? ''} data-judge={tc.judgePending ? 'yes' : 'no'}><button type="button" onClick={() => tc.setNight(true)}>go night</button></div>
  },
}))

const shell = () => (
  <TestCaseProvider>
    <TestCaseButton />
    <TestCaseBanner />
    <input aria-label="outside" />
  </TestCaseProvider>
)

const dialog = () => screen.findByRole('dialog', { name: 'Test case · prevention, screening and the safety net' }, { timeout: 20_000 })

beforeEach(() => {
  document.body.classList.remove('night')
  window.history.replaceState(null, '', '/')
})

test('the header button opens the dialog, Esc closes it and focus goes back to the button', async () => {
  render(shell())
  const btn = screen.getByRole('button', { name: 'Test case' })
  expect(btn).toHaveAttribute('id', 'runTest')
  btn.focus()
  fireEvent.click(btn)
  const dlg = await dialog()
  expect(dlg).toHaveAttribute('aria-modal', 'true')
  expect(await screen.findByTestId('body')).toBeInTheDocument()
  expect(within(dlg).getByRole('button', { name: 'Close the test case' })).toHaveFocus()
  expect(document.documentElement.style.overflow).toBe('hidden')
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(btn).toHaveFocus()
  expect(document.documentElement.style.overflow).toBe('')
})

test('the banner states the product and its button opens the dialog asking for the Judge path; Close restores focus to the banner button', async () => {
  render(shell())
  expect(screen.getByText(/AI care agents that keep Abu Dhabi families checked and safe at home/)).toBeInTheDocument()
  expect(screen.getByText(/four generations across six places/)).toBeInTheDocument()
  const start = screen.getByRole('button', { name: 'Start the 3-minute tour' })
  start.focus()
  fireEvent.click(start)
  const dlg = await dialog()
  const body = await screen.findByTestId('body')
  expect(body.dataset.case).toBe('')
  expect(body.dataset.judge).toBe('yes')
  fireEvent.click(within(dlg).getByRole('button', { name: 'Close the test case' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(start).toHaveFocus()
})

test('the page behind is inert while open and Tab stays inside the dialog', async () => {
  const { container } = render(shell())
  fireEvent.click(screen.getByRole('button', { name: 'Test case' }))
  const dlg = await dialog()
  expect(container).toHaveAttribute('inert')
  const close = within(dlg).getByRole('button', { name: 'Close the test case' })
  await screen.findByTestId('body')
  close.focus()
  // Close is the last control of the bar; the body's button comes after it, then Tab wraps to the first.
  const last = within(dlg).getByRole('button', { name: 'go night' })
  last.focus()
  fireEvent.keyDown(document, { key: 'Tab' })
  expect(dlg.contains(document.activeElement)).toBe(true)
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
  expect(dlg.contains(document.activeElement)).toBe(true)
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(container).not.toHaveAttribute('inert'))
})

test('?test=<key> opens that case on load and is removed from the address; ?test alone opens the picker', async () => {
  window.history.replaceState(null, '', '/individual/home?test=stroke&keep=1')
  const { unmount } = render(shell())
  await dialog()
  expect((await screen.findByTestId('body')).dataset.case).toBe('stroke')
  expect(window.location.search).toBe('?keep=1')
  unmount()
  window.history.replaceState(null, '', '/individual/home?test')
  render(shell())
  await dialog()
  expect((await screen.findByTestId('body')).dataset.case).toBe('')
  expect(window.location.search).toBe('')
})

test('an unknown ?test=<key> opens the picker, not a case', async () => {
  window.history.replaceState(null, '', '/individual/home?test=nobody')
  render(shell())
  await dialog()
  await waitFor(() => expect(screen.getByTestId('body').dataset.case).toBe(''))
})

test('the dialog is dark with the app theme or when the night prop is set, and mirrors in Arabic', async () => {
  const { rerender } = render(<TestCaseOverlay onClose={() => {}}><p>x</p></TestCaseOverlay>)
  const dlg = await dialog()
  expect(dlg).not.toHaveClass('dark')
  expect(dlg).toHaveAttribute('dir', 'ltr')
  await act(async () => { document.body.classList.add('night') })
  await waitFor(() => expect(dlg).toHaveClass('dark'))
  document.body.classList.remove('night')
  await waitFor(() => expect(dlg).not.toHaveClass('dark'))
  rerender(<TestCaseOverlay onClose={() => {}} night><p>x</p></TestCaseOverlay>)
  expect(dlg).toHaveClass('dark')
})

test('the layout renders only the regions it is given, and the judges panel replaces the case view', () => {
  const { rerender } = render(<TestCaseLayout card={<i>c</i>} log={<i>l</i>} />)
  expect(document.querySelector('.stepcard')).not.toBeNull()
  expect(document.querySelector('.log.card')).not.toBeNull()
  expect(document.querySelector('.picker')).toBeNull()
  expect(document.querySelector('.screens')).toBeNull()
  rerender(<TestCaseLayout tab="judges" judges={<i>j</i>} card={<i>c</i>} />)
  expect(document.querySelector('.tc-judges')).not.toBeNull()
  expect(document.querySelector('.stepcard')).toBeNull()
})

test('tabs follow the APG pattern: roving tabindex, arrows, Home and End, tabpanel labelled by its tab', async () => {
  render(<TestCaseOverlay onClose={() => {}}><TestCaseLayout tab="case" card={<h3>1 · Start</h3>} /></TestCaseOverlay>)
  await dialog()
  const tabs = screen.getAllByRole('tab')
  expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
  expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tabs[0].id)
  expect(tabs[0]).toHaveAttribute('aria-controls', 'v-demo')
  fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
  await waitFor(() => expect(tabs[1]).toHaveAttribute('aria-selected', 'true'))
  expect(tabs[1]).toHaveFocus()
  fireEvent.keyDown(tabs[1], { key: 'End' })
  await waitFor(() => expect(tabs[2]).toHaveAttribute('aria-selected', 'true'))
  fireEvent.keyDown(tabs[2], { key: 'Home' })
  await waitFor(() => expect(tabs[0]).toHaveAttribute('aria-selected', 'true'))
})

test('only the step title is a live region, not the whole step card', async () => {
  render(<TestCaseOverlay onClose={() => {}}><TestCaseLayout tab="case" card={<h3>1 · Start</h3>} /></TestCaseOverlay>)
  await dialog()
  expect(document.querySelector('#card')).not.toHaveAttribute('aria-live')
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 · Start'))
})
