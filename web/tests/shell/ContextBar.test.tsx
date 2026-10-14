import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AppStateProvider } from '@/state/AppState'
import { ContextBar } from '@/components/shell/ContextBar'

let mockPath = '/individual/home/'
const push = vi.fn((to: string) => { mockPath = to })
vi.mock('@/app/navigation', () => ({
  usePathname: () => mockPath,
  useRouter: () => ({ push, replace: vi.fn() }),
}))

const ui = () => (
  <AppStateProvider>
    <ContextBar />
  </AppStateProvider>
)

beforeEach(() => { mockPath = '/individual/home/'; push.mockClear(); sessionStorage.clear() })

test('family context bar shows title, banner and viewer fact', async () => {
  render(ui())
  expect(await screen.findByText('Margaret Collins, 78')).toBeInTheDocument()
  expect(screen.getByText('Family & carers view · James sees only what Margaret shares')).toBeInTheDocument()
  expect(await screen.findByText(/things Margaret shares/)).toBeInTheDocument()
})

test('switching to Margaret navigates to /individual/me', async () => {
  render(ui())
  await act(async () => { fireEvent.click(await screen.findByRole('button', { name: /Margaret \(her own app\)/ })) })
  expect(push).toHaveBeenCalledWith('/individual/me')
})

test('hospital view hides the who switch', async () => {
  mockPath = '/hospital/ed/'
  render(ui())
  expect(await screen.findByText('Pre-arrivals · Camperdown Stroke Centre')).toBeInTheDocument()
  expect(screen.queryByRole('group', { name: 'Whose view' })).toBeNull()
  expect(screen.getByText('Hospital view · Camperdown Stroke Centre')).toBeInTheDocument()
})
