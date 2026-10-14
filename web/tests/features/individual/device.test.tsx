import { fireEvent, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { DevicePage } from '@/features/individual/device/DevicePage'
import { PAGE_REGISTRY } from '@/features/registry'
import { mockCanvas, mockLayout, mockRaf } from '../../canvas/fakeCtx'
import { renderWithProviders } from '../../helpers/renderWithProviders'

const push = vi.fn()
vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/device/', useRouter: () => ({ push, replace: vi.fn() }) }))

beforeEach(() => {
  mockCanvas()
  mockLayout()
  mockRaf()
})
const toastText = () => document.getElementById('toast')!.textContent
const ready = () => screen.findByRole('heading', { name: 'Designed for Margaret' })

test('is registered for individual/device', () => {
  expect(PAGE_REGISTRY['individual/device']).toBe(DevicePage)
})

test('shows her home screen on the phone and the design facts', async () => {
  renderWithProviders(<DevicePage />, { who: 'self' })
  await ready()
  expect(screen.getByText('Wednesday 14 October')).toBeInTheDocument()
  expect(screen.getByText('Hello, Margaret')).toBeInTheDocument()
  expect(screen.getByText('Blood pressure tablet')).toBeInTheDocument()
  expect(screen.getByText('No training, no menus')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: "Margaret's family circle" })).toBeInTheDocument()
  expect(screen.getByText('28 pt')).toBeInTheDocument()
  expect(screen.getByText('92 px')).toBeInTheDocument()
  expect(screen.getByText('Two large buttons and one task at a time. Nothing to navigate.')).toBeInTheDocument()
})

test('phone buttons use the prototype toasts', async () => {
  renderWithProviders(<DevicePage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: "I've taken it" }))
  expect(toastText()).toBe('Noted · James will see it')
  fireEvent.click(screen.getByRole('button', { name: "I'm OK" }))
  expect(toastText()).toBe("The family knows you're OK")
})

test('Get help starts the night alert demo in the family view', async () => {
  const r = renderWithProviders(<DevicePage />, { who: 'self' })
  await ready()
  fireEvent.click(within(document.getElementById('devHome')!).getByRole('button', { name: 'Get help' }))
  expect(r.app().who).toBe('family')
  expect(r.app().emergency.active).toBe(true)
  expect(push).toHaveBeenCalledWith('/individual/live')
})
