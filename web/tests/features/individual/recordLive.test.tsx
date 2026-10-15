import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { RecordPage } from '@/features/individual/record/RecordPage'
import type { LiveView } from '@/domain/incident'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/record/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const idle = async () => {}
const liveValue: LiveIncidentValue = {
  live: true, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
  start: idle, reset: idle, checkin: idle, act: idle,
}
vi.mock('@/state/LiveIncident', () => ({ useLiveIncident: () => liveValue }))

const openPacket = async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await screen.findByText('Encounters, 2023–2026')
  fireEvent.click(screen.getByRole('button', { name: 'Preview the pre-arrival packet' }))
  return document.getElementById('drawer')!
}

test('preview shows the live packet when one was received', async () => {
  liveValue.view = {
    packet: {
      meta: '', summary: '', incoming: false,
      rows: [['Patient', 'Margaret Collins, 78 · Female'], ['Family history', 'father: stroke at 68']],
    },
  } as unknown as LiveView
  const drawer = await openPacket()
  await waitFor(() => expect(within(drawer).getByText('father: stroke at 68')).toBeInTheDocument())
})

test('preview falls back to the fixture packet without a received packet', async () => {
  liveValue.view = null
  const drawer = await openPacket()
  await waitFor(() => expect(within(drawer).getByText(/Female, 78/)).toBeInTheDocument())
})
