import { screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { FacilitiesCard } from '@/features/government/population/FacilitiesCard'
import { SignalsTableCard } from '@/features/government/signals/SignalsTableCard'
import { getGovernment, getSignals } from '@/data/repo'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/government/population/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

test('facilities table shows "<10" instead of an open count under 10, and keeps counts of 10 or more', async () => {
  const g = await getGovernment()
  renderWithProviders(<FacilitiesCard facilities={g.facilities} />, { who: 'family' })
  const row = (await screen.findByText('Al Bateen Family Health Centre')).closest('tr')!
  // The open count and every rate over that small group are hidden.
  expect(within(row).getAllByText('<10').length).toBeGreaterThanOrEqual(4)
  expect(within(row).queryByText('9')).toBeNull()
  const kept = screen.getByText('Al Khalidiya Family Health Centre').closest('tr')!
  expect(within(kept).getByText('12')).toBeInTheDocument()
  expect(screen.getByRole('note')).toHaveTextContent('Groups under 10 are hidden to protect privacy')
})

test('signals table hides an affected count under 10', async () => {
  const s = await getSignals()
  renderWithProviders(<SignalsTableCard rows={s.signals} />, { who: 'family' })
  const row = (await screen.findByText('Referrals lost at provider change')).closest('tr')!
  expect(within(row).getByText('<10')).toBeInTheDocument()
  expect(row).not.toHaveTextContent('8 cases')
})
