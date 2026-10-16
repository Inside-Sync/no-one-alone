import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { ApiError } from '@/data/api'
import i18n from '@/i18n'
import { DevicePage } from '@/features/individual/device/DevicePage'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { mockCanvas, mockLayout, mockRaf } from '../../canvas/fakeCtx'
import { renderWithProviders } from '../../helpers/renderWithProviders'

const push = vi.fn()
vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/device/', useRouter: () => ({ push, replace: vi.fn() }) }))

const idle = async () => {}
const start = vi.fn<(s: string) => Promise<void>>()
const liveValue: LiveIncidentValue = {
  live: true, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
  start: (s) => start(s), reset: idle, checkin: idle, act: idle, recover: idle,
}
vi.mock('@/state/LiveIncident', () => ({ useLiveIncident: () => liveValue }))

beforeEach(() => {
  mockCanvas()
  mockLayout()
  mockRaf()
  push.mockClear()
  start.mockReset()
})
const toastText = () => document.getElementById('toast')!.textContent
const clickHelp = async () => {
  const r = renderWithProviders(<DevicePage />, { who: 'self' })
  await screen.findByRole('heading', { name: 'Designed for Margaret' })
  fireEvent.click(within(document.getElementById('devHome')!).getByRole('button', { name: 'Get help' }))
  return r
}

test('help in live mode starts the stroke demo and opens Live', async () => {
  start.mockResolvedValue(undefined)
  const r = await clickHelp()
  expect(start).toHaveBeenCalledWith('stroke')
  await waitFor(() => expect(push).toHaveBeenCalledWith('/individual/live'))
  expect(r.app().who).toBe('family')
  expect(r.app().emergency.active).toBe(false)
})

test('help in live mode while a demo runs opens Live', async () => {
  start.mockRejectedValue(new ApiError(409, 'INVALID_STATE', 'busy'))
  const r = await clickHelp()
  await waitFor(() => expect(push).toHaveBeenCalledWith('/individual/live'))
  expect(toastText()).not.toBe(i18n.t('live:live.failed'))
  expect(r.app().emergency.active).toBe(false)
})

test('help in live mode on a server failure stays on Device', async () => {
  start.mockRejectedValue(new ApiError(0, 'NETWORK', 'offline'))
  const r = await clickHelp()
  await waitFor(() => expect(toastText()).toBe(i18n.t('live:live.failed')))
  expect(toastText()).toBeTruthy()
  expect(push).not.toHaveBeenCalled()
  expect(r.app().who).toBe('self')
  expect(r.app().emergency.active).toBe(false)
})
