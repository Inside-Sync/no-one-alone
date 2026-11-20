import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { AppStateProvider } from '@/state/AppState'
import { ToastProvider } from '@/components/ui/Toast'
import { TopNav } from '@/components/shell/TopNav'
import { TourProvider } from '@/state/Tour'

vi.mock('@/app/navigation', () => ({
  usePathname: () => '/hospital/overview',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const SLOW = { timeout: 40_000 } // the dialog, the scenario set, the Test case texts and CSS load lazily

test('the header Benchmark button opens the live Benchmark in a dialog; Esc closes it and focus returns', async () => {
  render(
    <AppStateProvider>
      <ToastProvider>
        <TourProvider>
          <TopNav />
        </TourProvider>
      </ToastProvider>
    </AppStateProvider>,
  )
  const opener = screen.getByRole('button', { name: 'Run the benchmark' })
  expect(opener).toHaveTextContent('Benchmark')
  expect(opener.closest('.tn-right')).not.toBeNull()
  opener.focus()
  fireEvent.click(opener)

  const dlg = await screen.findByRole('dialog', { name: 'Benchmark' }, SLOW)
  expect(dlg).toHaveClass('tc', 'bmk')
  const run = await within(dlg).findByRole('button', { name: 'Run the benchmark' }, SLOW)
  expect(run).toBeEnabled()
  expect(within(dlg).getByRole('progressbar', { name: 'Benchmark progress' })).toBeInTheDocument()
  // No Test case tab to open a scenario in: the scenario list has no "Open" buttons.
  expect(within(dlg).queryByRole('button', { name: 'Open as a case' })).toBeNull()

  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(opener).toHaveFocus()
}, 60_000)
