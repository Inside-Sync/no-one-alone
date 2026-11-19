import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AppStateProvider, useAppState } from '@/state/AppState'
import { ToastProvider } from '@/components/ui/Toast'
import { TopNav } from '@/components/shell/TopNav'
import { TourProvider } from '@/state/Tour'
import { withLegacyUi } from '../helpers/legacyUi'

let mockPath = '/individual/me/'
const push = vi.fn((to: string) => { mockPath = to })
const replace = vi.fn()
vi.mock('@/app/navigation', () => ({
  usePathname: () => mockPath,
  useRouter: () => ({ push, replace }),
}))

const ui = () => (
  <AppStateProvider>
    <ToastProvider>
      <TourProvider>
        <TopNav />
      </TourProvider>
    </ToastProvider>
  </AppStateProvider>
)

beforeEach(() => {
  mockPath = '/individual/me/'
  push.mockClear()
  sessionStorage.clear()
  localStorage.clear()
  document.body.classList.remove('night')
})

test('switching view shows that view tabs and sets body data-view', async () => {
  const { rerender } = render(ui())
  expect(await screen.findByRole('button', { name: /My day/ })).toBeInTheDocument()
  expect(document.body.dataset.view).toBe('individual')
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hospital' })) })
  expect(push).toHaveBeenCalledWith('/hospital/overview')
  rerender(ui())
  expect(screen.getByRole('button', { name: 'Emergency arrivals' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /care record/i })).toBeNull()
  expect(document.body.dataset.view).toBe('hospital')
})

test('current tab is aria-current and clicking a tab navigates', async () => {
  render(ui())
  const home = await screen.findByRole('button', { name: /My day/ })
  expect(home).toHaveAttribute('aria-current', 'page')
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /My care record/ })) })
  expect(push).toHaveBeenCalledWith('/individual/record')
})

test('search filters people and areas; Enter navigates', async () => {
  render(ui())
  const q = await screen.findByLabelText('Search')
  // A person opens their health page (the first result for "a" is the person the app is about).
  fireEvent.change(q, { target: { value: 'a' } })
  expect((await screen.findAllByRole('option')).length).toBeGreaterThan(0)
  fireEvent.keyDown(q, { key: 'Enter' })
  expect(push).toHaveBeenCalledWith('/individual/health')
  fireEvent.change(q, { target: { value: 'mussafah' } })
  expect(await screen.findByRole('option', { name: /Mussafah/ })).toBeInTheDocument()
  fireEvent.keyDown(q, { key: 'Enter' })
  expect(push).toHaveBeenLastCalledWith('/government/population')
})

test('night alert demo goes to the live tab as family', async () => {
  render(ui())
  await act(async () => { fireEvent.click(await screen.findByRole('switch', { name: /Night alert demo/ })) })
  expect(push).toHaveBeenCalledWith('/individual/live')
})

test('the light/dark switch is remembered under noa-theme and puts night on the body', async () => {
  render(ui())
  const btn = await screen.findByRole('button', { name: 'Dark mode' })
  expect(document.body.classList.contains('night')).toBe(false)
  await act(async () => { fireEvent.click(btn) })
  expect(localStorage.getItem('noa-theme')).toBe('dark')
  expect(document.body.classList.contains('night')).toBe(true)
  expect(screen.getByRole('button', { name: 'Light mode' })).toBeInTheDocument()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Light mode' })) })
  expect(localStorage.getItem('noa-theme')).toBe('light')
  expect(document.body.classList.contains('night')).toBe(false)
})

test('the dark theme survives a night alert: ending the alert returns to the chosen theme', async () => {
  localStorage.setItem('noa-theme', 'dark')
  render(ui())
  const sw = await screen.findByRole('switch', { name: /Night alert demo/ })
  expect(sw).toHaveAttribute('aria-checked', 'false')
  expect(document.body.classList.contains('night')).toBe(true)
  await act(async () => { fireEvent.click(sw) })
  expect(sw).toHaveAttribute('aria-checked', 'true')
  await act(async () => { fireEvent.click(sw) })
  expect(sw).toHaveAttribute('aria-checked', 'false')
  expect(document.body.classList.contains('night')).toBe(true)
})

test("Moza's case button starts the walkthrough on its first page", async () => {
  render(ui())
  await act(async () => { fireEvent.click(await screen.findByRole('button', { name: "Moza's case" })) })
  expect(push).toHaveBeenCalledWith('/individual/me')
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
      <TourProvider>
        <TopNav />
        <Controls />
      </TourProvider>
    </ToastProvider>
  </AppStateProvider>
)

test('the night alert tab appears only on its page; it carries LIVE while the demo runs, none otherwise', async () => {
  render(withControls())
  expect(await screen.findByRole('button', { name: /My day/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Night alert \(replay\)/ })).toBeNull()
})

test('REPLAY badge on the night alert tab while the demo runs; none otherwise', async () => {
  mockPath = '/individual/live/'
  render(withControls())
  const tab = await screen.findByRole('button', { name: /Night alert \(replay\)/ })
  expect(tab.querySelector('.badge')).toBeNull()
  fireEvent.click(screen.getByText('go'))
  expect(screen.getByRole('button', { name: /Night alert \(replay\)/ }).querySelector('.badge')).toHaveTextContent('REPLAY')
  fireEvent.click(screen.getByText('stop'))
  expect(screen.getByRole('button', { name: /Night alert \(replay\)/ }).querySelector('.badge')).toBeNull()
})

test('Emergency arrivals gets a 1 badge from 02:07 (step 7), not before, and loses it on End', async () => {
  mockPath = '/hospital/ed/'
  render(withControls())
  const ed = () => screen.getByRole('button', { name: /Emergency arrivals/ })
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

// These tests drive the old Test case entry points and header demos, which the redesign hides by default.
withLegacyUi()
