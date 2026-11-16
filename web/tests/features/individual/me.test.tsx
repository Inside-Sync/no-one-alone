import { fireEvent, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { MePage } from '@/features/individual/me/MePage'
import { PAGE_REGISTRY } from '@/features/registry'
import { renderWithProviders } from '../../helpers/renderWithProviders'

const push = vi.fn()
vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/me/', useRouter: () => ({ push, replace: vi.fn() }) }))

beforeEach(() => push.mockClear())
const toastText = () => document.getElementById('toast')!.textContent

test('is registered for individual/me', () => {
  expect(PAGE_REGISTRY['individual/me']).toBe(MePage)
})

test('shows every section in prototype order', async () => {
  renderWithProviders(<MePage />, { who: 'self' })
  await screen.findByText('Sees 8 of 11')
  expect(screen.getByText('Good afternoon, Umm Khalid 🌞')).toBeInTheDocument()
  expect(screen.getByText("You're doing well today. Here's your day, just for you.")).toBeInTheDocument()
  expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual([
    'Your people', 'Ideas for you', 'Your privacy promise', 'Who looked at your information',
  ])
  expect(screen.getAllByRole('row')).toHaveLength(6)
  expect(screen.getByText('Today 09:12')).toBeInTheDocument()
})

test('a big tile toasts its text', async () => {
  renderWithProviders(<MePage />, { who: 'self' })
  fireEvent.click(screen.getByRole('button', { name: /3,240 steps/ }))
  expect(toastText()).toBe('3,240 steps · nearly at 3,500!')
})

test('pause here shares the same state and labels flip', async () => {
  const r = renderWithProviders(<MePage />, { who: 'self' })
  await screen.findByText('Sees 8 of 11')
  fireEvent.click(screen.getByRole('button', { name: 'Pause sharing until tomorrow' }))
  expect(toastText()).toBe('Sharing paused until 9 am tomorrow · safety alerts still on')
  expect(r.app().paused).toBe(true)
  expect(screen.getAllByText('Paused')).toHaveLength(6)
  fireEvent.click(screen.getByRole('button', { name: 'Resume sharing' }))
  expect(toastText()).toBe('Sharing resumed')
})

test('the people list is the circle of Moza and has no link to a removed settings page', async () => {
  renderWithProviders(<MePage />, { who: 'self' })
  await screen.findByText('Sees 8 of 11')
  for (const name of ['Khalid', 'Alia', 'Hamad', 'Priya', 'Dr Fatima Al Ali', 'Hospital']) expect(screen.getAllByText(name).length).toBeGreaterThan(0)
  expect(screen.getByText('Son · Al Ain')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Change who sees what' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'See all settings' })).toBeNull()
  expect(push).not.toHaveBeenCalled()
})

test('the main card is the walkthrough target for My day', () => {
  renderWithProviders(<MePage />, { who: 'self' })
  expect(document.querySelector('[data-tour="me"]')).toHaveTextContent('Good afternoon, Umm Khalid')
})

test('idea buttons toast once and then show done', async () => {
  renderWithProviders(<MePage />, { who: 'self' })
  fireEvent.click(screen.getAllByRole('button', { name: 'Yes please' })[0])
  expect(toastText()).toBe('Lift booked for Thursday 11:00')
  expect(screen.getByRole('button', { name: '✓ Booked' })).toBeDisabled()
})
