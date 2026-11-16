import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AppStateProvider, useAppState } from '@/state/AppState'
import { ContextBar } from '@/components/shell/ContextBar'

let mockPath = '/individual/health/'
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

/** A button that makes the viewer the family role (Moza's own app is the default). */
const AsFamily = () => {
  const { setWho } = useAppState()
  return <button onClick={() => setWho('family')}>family</button>
}

beforeEach(() => { mockPath = '/individual/health/'; push.mockClear(); sessionStorage.clear() })

test("Moza's own app is the default role: banner, title and facts of My day", async () => {
  mockPath = '/individual/me/'
  render(ui())
  expect(await screen.findByText('Hello, Moza')).toBeInTheDocument()
  expect(screen.getByText("Moza's own view · she controls her information")).toBeInTheDocument()
  expect(screen.getByText('Your own space · only you see this page')).toBeInTheDocument()
  expect(document.getElementById('facts')).toHaveTextContent("You're sharing with 6 peopleCameras noneLocation off")
})

test('family context bar shows title, banner and viewer fact', async () => {
  render(<AppStateProvider><ContextBar /><AsFamily /></AppStateProvider>)
  await act(async () => { fireEvent.click(await screen.findByText('family')) })
  expect(await screen.findByText('Health · Moza Al Hammadi')).toBeInTheDocument()
  expect(screen.getByText(/^Family & carers view · .+ sees only what Moza shares$/)).toBeInTheDocument()
  expect(await screen.findByText(/things Moza shares/)).toBeInTheDocument()
})

test('the record page reads "My care record" for Moza and "Care record" for family', async () => {
  mockPath = '/individual/record/'
  render(<AppStateProvider><ContextBar /><AsFamily /></AppStateProvider>)
  expect(await screen.findByText('My care record')).toBeInTheDocument()
  expect(screen.getByText('Care setting')).toBeInTheDocument()
  await act(async () => { fireEvent.click(screen.getByText('family')) })
  expect(await screen.findByText('Care record · Moza Al Hammadi')).toBeInTheDocument()
  expect(screen.getByText('What Moza shares from her record')).toBeInTheDocument()
})

test('switching roles navigates: Moza to /individual/me, family to /individual/health', async () => {
  render(ui())
  await act(async () => { fireEvent.click(await screen.findByRole('button', { name: /Moza \(her own app\)/ })) })
  expect(push).toHaveBeenCalledWith('/individual/me')
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Family & carers/ })) })
  expect(push).toHaveBeenLastCalledWith('/individual/health')
})

test('hospital view hides the who switch', async () => {
  mockPath = '/hospital/ed/'
  render(ui())
  expect(await screen.findByText('Emergency arrivals · Corniche Stroke Centre')).toBeInTheDocument()
  expect(screen.queryByRole('group', { name: 'Whose view' })).toBeNull()
  expect(screen.getByText('Hospital and clinics · Corniche Stroke Centre and family health centres')).toBeInTheDocument()
})

test('on the night alert page the subtitle follows the demo step, then reverts', async () => {
  mockPath = '/individual/live/'
  const Go = () => {
    const { dispatchEmergency } = useAppState()
    return <><button onClick={() => dispatchEmergency({ type: 'start' })}>go</button><button onClick={() => dispatchEmergency({ type: 'goto', step: 8 })}>to11</button><button onClick={() => dispatchEmergency({ type: 'end' })}>stop</button></>
  }
  render(<AppStateProvider><ContextBar /><Go /></AppStateProvider>)
  const sub = () => document.getElementById('pgSub')!.textContent
  expect(await screen.findByText('Night alert · replay of 15 October')).toBeInTheDocument()
  expect(sub()).not.toMatch(/^Live ·/)
  fireEvent.click(screen.getByText('go'))
  expect(sub()).toMatch(/^Live · 02:03/)
  fireEvent.click(screen.getByText('to11'))
  expect(sub()).toMatch(/^Live · 02:11/)
  fireEvent.click(screen.getByText('stop'))
  expect(sub()).not.toMatch(/^Live ·/)
})
