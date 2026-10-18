import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AppStateProvider, useAppState } from '@/state/AppState'
import { ToastProvider } from '@/components/ui/Toast'
import { TopNav } from '@/components/shell/TopNav'

let mockPath = '/individual/home/'
const push = vi.fn((to: string) => { mockPath = to })
const replace = vi.fn()
vi.mock('@/app/navigation', () => ({
  usePathname: () => mockPath,
  useRouter: () => ({ push, replace }),
}))

const ui = () => (
  <AppStateProvider>
    <ToastProvider>
      <TopNav />
    </ToastProvider>
  </AppStateProvider>
)

beforeEach(() => {
  mockPath = '/individual/home/'
  push.mockClear()
  sessionStorage.clear()
})

test('switching view shows that view tabs and sets body data-view', async () => {
  const { rerender } = render(ui())
  expect(await screen.findByRole('button', { name: /Home/ })).toBeInTheDocument()
  expect(document.body.dataset.view).toBe('individual')
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hospital' })) })
  expect(push).toHaveBeenCalledWith('/hospital/ed')
  rerender(ui())
  expect(screen.getByRole('button', { name: 'Pre-arrivals' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Care record/ })).toBeNull()
  expect(document.body.dataset.view).toBe('hospital')
})

test('current tab is aria-current and clicking a tab navigates', async () => {
  render(ui())
  const home = await screen.findByRole('button', { name: /Home/ })
  expect(home).toHaveAttribute('aria-current', 'page')
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Care record/ })) })
  expect(push).toHaveBeenCalledWith('/individual/record')
})

test('search filters people and suburbs; Enter navigates', async () => {
  render(ui())
  const q = await screen.findByLabelText('Search')
  fireEvent.change(q, { target: { value: 'sarah' } })
  expect(await screen.findByRole('option', { name: /Sarah/ })).toBeInTheDocument()
  fireEvent.keyDown(q, { key: 'Enter' })
  expect(push).toHaveBeenCalledWith('/individual/home')
  fireEvent.change(q, { target: { value: 'tempe' } })
  expect(await screen.findByRole('option', { name: /Tempe/ })).toBeInTheDocument()
  fireEvent.keyDown(q, { key: 'Enter' })
  expect(push).toHaveBeenLastCalledWith('/community/community')
})

test('night alert demo goes to the live tab as family', async () => {
  render(ui())
  await act(async () => { fireEvent.click(await screen.findByRole('switch', { name: /Night alert demo/ })) })
  expect(push).toHaveBeenCalledWith('/individual/live')
})

test('bell and avatar show their data-toast copy', async () => {
  render(ui())
  const bell = screen.getByRole('button', { name: 'Notifications' })
  await act(async () => { fireEvent.click(bell) })
  expect(screen.getByRole('status')).toHaveTextContent(bell.getAttribute('data-toast')!)
})

test('useToast throws outside a provider', () => {
  const err = vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => render(<TopNav />)).toThrow()
  err.mockRestore()
})

function Controls() {
  const { dispatchEmergency } = useAppState()
  return (
    <>
      <button onClick={() => dispatchEmergency({ type: 'start' })}>go</button>
      <button onClick={() => dispatchEmergency({ type: 'goto', step: 6 })}>to06</button>
      <button onClick={() => dispatchEmergency({ type: 'goto', step: 7 })}>to07</button>
      <button onClick={() => dispatchEmergency({ type: 'end' })}>stop</button>
    </>
  )
}
const withControls = () => (
  <AppStateProvider>
    <ToastProvider>
      <TopNav />
      <Controls />
    </ToastProvider>
  </AppStateProvider>
)

test('LIVE badge on Emergency while the demo runs; none otherwise', async () => {
  render(withControls())
  const tab = await screen.findByRole('button', { name: /Emergency/ })
  expect(tab.querySelector('.badge')).toBeNull()
  fireEvent.click(screen.getByText('go'))
  expect(screen.getByRole('button', { name: /Emergency/ }).querySelector('.badge')).toHaveTextContent('LIVE')
  fireEvent.click(screen.getByText('stop'))
  expect(screen.getByRole('button', { name: /Emergency/ }).querySelector('.badge')).toBeNull()
})

test('Pre-arrivals gets a 1 badge from 02:07 (step 7), not before, and loses it on End', async () => {
  mockPath = '/hospital/ed/'
  render(withControls())
  const ed = () => screen.getByRole('button', { name: /Pre-arrivals/ })
  fireEvent.click(await screen.findByText('go'))
  expect(ed().querySelector('.badge')).toBeNull()
  fireEvent.click(screen.getByText('to06'))
  expect(ed().querySelector('.badge')).toBeNull()
  fireEvent.click(screen.getByText('to07'))
  expect(ed().querySelector('.badge')).toHaveTextContent('1')
  fireEvent.click(screen.getByText('stop'))
  expect(ed().querySelector('.badge')).toBeNull()
})

test('the night alert demo starts the emergency state', async () => {
  const r = render(withControls())
  await act(async () => { fireEvent.click(await screen.findByRole('switch', { name: /Night alert demo/ })) })
  expect(push).toHaveBeenCalledWith('/individual/live')
  expect(document.body).toHaveClass('night')
  r.unmount()
  expect(document.body.classList.contains('night')).toBe(false)
})

test('the night alert demo is a switch: on starts the emergency, off ends it and leaves night', async () => {
  render(withControls())
  const sw = await screen.findByRole('switch', { name: /Night alert demo/ })
  expect(sw).toHaveAttribute('aria-checked', 'false')
  await act(async () => { fireEvent.click(sw) })
  expect(sw).toHaveAttribute('aria-checked', 'true')
  expect(document.body).toHaveClass('night')
  await act(async () => { fireEvent.click(sw) })
  expect(sw).toHaveAttribute('aria-checked', 'false')
  expect(document.body.classList.contains('night')).toBe(false)
})
