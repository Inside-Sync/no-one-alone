import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TestCaseButton } from '@/features/testcase/entry/TestCaseButton'
import { TestCaseProvider, readDeepLink } from '@/features/testcase/entry/TestCaseProvider'
import { SCENARIOS } from '@/features/testcase/bench'
import { TestCaseOverlay } from '@/features/testcase/ui/TestCaseOverlay'
import { useTestCaseTab } from '@/features/testcase/ui/tabContext'
import tcBenchEn from '@/locales/en/tcBench.json'
import tcBenchAr from '@/locales/ar/tcBench.json'
import { withLegacyUi } from '../helpers/legacyUi'

const shell = () => (
  <TestCaseProvider>
    <TestCaseButton />
  </TestCaseProvider>
)

const SLOW = { timeout: 40_000 } // the overlay, its locales and CSS load lazily; a full parallel run can take well over 15 s
const status = (dlg: HTMLElement) => dlg.querySelector('.tc-bn-status') as HTMLElement

const keys = (o: unknown, prefix = ''): string[] =>
  Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]))

beforeEach(() => {
  document.body.classList.remove('night')
  window.history.replaceState(null, '', '/')
})

test('?test=bench opens the Benchmark tab, and the address loses the parameter', async () => {
  expect(readDeepLink('?test=bench')).toEqual({ caseKey: null, tab: 'bench' })
  expect(readDeepLink('?test=stroke')).toEqual({ caseKey: 'stroke' })
  expect(readDeepLink('?test')).toEqual({ caseKey: null })
  window.history.replaceState(null, '', '/individual/home?test=bench&keep=1')
  render(shell())
  const dlg = await screen.findByRole('dialog', {}, SLOW)
  const tab = await within(dlg).findByRole('tab', { name: 'Benchmark' }, SLOW)
  expect(tab).toHaveAttribute('aria-selected', 'true')
  expect(await within(dlg).findByRole('button', { name: 'Run the benchmark' }, SLOW)).toBeInTheDocument()
  expect(window.location.search).toBe('?keep=1')
}, 60_000) // Mounts the lazy overlay; under a full parallel run it can exceed the 5 s default (it passes alone in about 1 s).

test('the provider holds the tab: the bar switches Test case, For judges and Benchmark', async () => {
  render(shell())
  fireEvent.click(screen.getByRole('button', { name: 'Test case' }))
  const dlg = await screen.findByRole('dialog', {}, SLOW)
  const tabs = within(dlg).getAllByRole('tab')
  expect(tabs.map((t) => t.textContent)).toEqual(['Test case', 'For judges', 'Benchmark'])
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  fireEvent.click(tabs[2])
  expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
  expect(await within(dlg).findByText('What this is, and what it is not', {}, SLOW)).toBeInTheDocument()
  fireEvent.click(tabs[1])
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
  // only one tab bar: the portal hack is gone
  expect(dlg.querySelectorAll('.tc-tabs')).toHaveLength(1)
  expect(dlg.querySelector('.tc-tabs-host')).toBeNull()
})

test('an overlay without a provider keeps its own tab and tells the body', () => {
  const Body = () => { const { tab } = useTestCaseTab(); return <p data-testid="t">{tab}</p> }
  render(<TestCaseOverlay onClose={() => {}}><Body /></TestCaseOverlay>)
  expect(screen.getByTestId('t')).toHaveTextContent('case')
  fireEvent.click(screen.getByRole('tab', { name: 'Benchmark' }))
  expect(screen.getByTestId('t')).toHaveTextContent('bench')
})

test('Run shows progress, then the metrics, the confusion matrix, the subgroups and the list; a scenario opens as a case', async () => {
  window.history.replaceState(null, '', '/?test=bench')
  render(shell())
  const dlg = await screen.findByRole('dialog', {}, SLOW)
  expect(await within(dlg).findByText(/Not run yet/, {}, SLOW)).toBeInTheDocument()
  expect(within(dlg).getByRole('note')).toHaveTextContent('not clinical validation')
  expect(within(dlg).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  fireEvent.click(within(dlg).getByRole('button', { name: 'Run the benchmark' }))
  await waitFor(() => expect(status(dlg).textContent).toMatch(/^Finished: \d+ of \d+ scenarios match/), { timeout: 40_000 })
  expect(within(dlg).getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(SCENARIOS.length))
  expect(within(dlg).getByText('Sensitivity, 998 now')).toBeInTheDocument()
  expect(within(dlg).getByRole('table', { name: /Confusion matrix/ })).toBeInTheDocument()
  expect(within(dlg).getByText('Subgroups')).toBeInTheDocument()
  expect(within(dlg).getByText('Accuracy by rule')).toBeInTheDocument()
  expect(status(dlg).textContent).toMatch(new RegExp(`^Finished: ${SCENARIOS.length} of ${SCENARIOS.length} scenarios match`))
  expect(within(dlg).getByText('No differences. Every scenario that ran matches the rule table.')).toBeInTheDocument()
  // filter by group and open one as a case
  fireEvent.change(within(dlg).getByLabelText('Group'), { target: { value: 'family-results' } })
  expect(within(dlg).getByText(`Showing 22 of ${SCENARIOS.length}`)).toBeInTheDocument()
  fireEvent.click(within(dlg).getAllByRole('button', { name: 'Open as a case' })[0])
  const caseTab = within(dlg).getByRole('tab', { name: 'Test case' })
  expect(caseTab).toHaveAttribute('aria-selected', 'true')
  expect(await within(dlg).findByRole('button', { name: /Start with the family/, pressed: true })).toBeInTheDocument()
  // the numbers survive a trip to another tab
  fireEvent.click(within(dlg).getByRole('tab', { name: 'Benchmark' }))
  expect(within(dlg).getByText('Sensitivity, 998 now')).toBeInTheDocument()
}, 60_000)

test('a run can be cancelled and says how far it got', async () => {
  window.history.replaceState(null, '', '/?test=bench')
  render(shell())
  const dlg = await screen.findByRole('dialog', {}, SLOW)
  fireEvent.click(await within(dlg).findByRole('button', { name: 'Run the benchmark' }, SLOW))
  fireEvent.click(await within(dlg).findByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(status(dlg).textContent).toMatch(/^Cancelled after \d+ of \d+ scenarios/), { timeout: 20_000 })
  expect(within(dlg).getByRole('button', { name: 'Run again' })).toBeEnabled()
}, 30_000)

test('the English and Arabic texts have identical keys and no placeholder is lost', () => {
  expect(keys(tcBenchAr).sort()).toEqual(keys(tcBenchEn).sort())
  const flat = (o: unknown): Record<string, string> => Object.fromEntries(keys(o).map((k) => [k, k.split('.').reduce<unknown>((x, p) => (x as Record<string, unknown>)[p], o) as string]))
  const en = flat(tcBenchEn), ar = flat(tcBenchAr)
  for (const k of Object.keys(en)) {
    const ph = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join()
    expect(ph(ar[k]), k).toBe(ph(en[k]))
    expect(ar[k].length, k).toBeGreaterThan(0)
  }
  expect(Object.values(ar).some((v) => /[؀-ۿ]/.test(v))).toBe(true)
})

// These tests drive the old Test case entry points and header demos, which the redesign hides by default.
withLegacyUi()
