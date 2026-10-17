import { fireEvent, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { LivePage } from '@/features/individual/live/LivePage'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { mockCanvas, mockLayout, mockRaf } from '../../canvas/fakeCtx'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/live/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const idle = async () => {}
const start = vi.fn<LiveIncidentValue['start']>(async () => {})
const liveValue: LiveIncidentValue = {
  live: true, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
  start: (s, o) => start(s, o), reset: idle, checkin: idle, act: idle, recover: idle,
}
vi.mock('@/state/LiveIncident', () => ({ useLiveIncident: () => liveValue }))

beforeEach(() => {
  mockCanvas()
  mockLayout()
  mockRaf()
  start.mockClear()
})

const render = async () => {
  renderWithProviders(<LivePage />)
  await screen.findByRole('heading', { name: 'Simulator' })
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const hrSlider = () => screen.getByRole('slider', { name: /^Heart rate/ })
const check = (text: RegExp) => screen.getByText(text).closest('li')!

test('Sound asleep sets the heart rate to 57', async () => {
  await render()
  click('Sound asleep')
  expect(hrSlider()).toHaveValue('57')
  expect(hrSlider()).toHaveAttribute('aria-valuetext', '57 bpm')
})

test('Start with Night emergency starts stroke with the overrides', async () => {
  await render()
  click('Sound asleep')
  click('Night emergency')
  click('Start')
  expect(start).toHaveBeenCalledWith('stroke', { hr: 142, movementMin: 4, noReplySeconds: 15 })
})

test('Moving disables the not-moving slider', async () => {
  await render()
  const still = screen.getByRole('slider', { name: /^Not moving for/ })
  expect(still).toBeEnabled()
  click('Moving')
  expect(still).toBeDisabled()
})

test('check chips: both met for Night, heart rate not met for Sound asleep', async () => {
  await render()
  click('Night emergency')
  expect(within(check(/^Not moving for 2 min or more/)).getByText('Met')).toBeInTheDocument()
  expect(within(check(/^Heart rate at least 87/)).getByText('Met')).toBeInTheDocument()
  click('Sound asleep')
  expect(within(check(/^Not moving for 2 min or more/)).getByText('Met')).toBeInTheDocument()
  expect(within(check(/^Heart rate at least 87/)).getByText('Not met')).toBeInTheDocument()
})
