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
  expect(screen.getByText('Good afternoon, Maggie 🌞')).toBeInTheDocument()
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

test('"Change who sees what" and "See all settings" go to privacy', async () => {
  renderWithProviders(<MePage />, { who: 'self' })
  fireEvent.click(screen.getByRole('button', { name: 'Change who sees what' }))
  expect(push).toHaveBeenLastCalledWith('/individual/privacy')
  fireEvent.click(screen.getByRole('button', { name: 'See all settings' }))
  expect(push).toHaveBeenCalledTimes(2)
})

test('idea buttons toast once and then show done', async () => {
  renderWithProviders(<MePage />, { who: 'self' })
  fireEvent.click(screen.getAllByRole('button', { name: 'Yes please' })[0])
  expect(toastText()).toBe('Lift booked for Thursday 11:00')
  expect(screen.getByRole('button', { name: '✓ Booked' })).toBeDisabled()
})
