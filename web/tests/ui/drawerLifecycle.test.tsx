import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, useNavigate } from 'react-router'
import { vi } from 'vitest'
import { DrawerReset } from '@/components/shell/DrawerReset'
import { DRAWER_SLIDE_MS, DrawerProvider, useDrawer } from '@/components/ui/Drawer'
import { ToastProvider } from '@/components/ui/Toast'
import { HomePage } from '@/features/individual/home/HomePage'
import { KpiDrawerBody } from '@/features/individual/home/drawers'
import type { Kpi } from '@/data/types'
import { resetMockSource } from '@/data/sources/mock'
import { AppStateProvider, useAppState, type AppStateValue } from '@/state/AppState'
import { mockCanvas, mockLayout, mockRaf } from '../canvas/fakeCtx'

// Real router (no navigation mock): DrawerReset reads the pathname, and one test changes it.

beforeEach(() => {
  mockCanvas()
  mockLayout()
  mockRaf()
  sessionStorage.clear()
  resetMockSource()
})

const captured: { app?: AppStateValue } = {}
function Probe() {
  const state = useAppState()
  useEffect(() => { captured.app = state })
  return null
}
const app = new Proxy({} as AppStateValue, { get: (_, k) => captured.app![k as keyof AppStateValue] })

/** The real App order: AppState > Toast > Drawer, with DrawerReset inside both. */
function renderApp(ui: React.ReactElement, viewer = 'james') {
  sessionStorage.setItem('noa-app-state', JSON.stringify({ who: 'family', viewer }))
  return render(
    <MemoryRouter initialEntries={['/individual/home']}>
      <AppStateProvider>
        <ToastProvider>
          <DrawerProvider>
            <DrawerReset />
            <Probe />
            <div className="wrap">{ui}</div>
          </DrawerProvider>
        </ToastProvider>
      </AppStateProvider>
    </MemoryRouter>,
  )
}

const drBody = () => document.getElementById('drBody')!.textContent ?? ''
const isOpen = () => document.getElementById('drawer')!.classList.contains('on')
const ready = () => screen.findByText('🤖 What Noa did today')

test('closed BP drawer: pausing sharing drops its value from the DOM at once', async () => {
  renderApp(<HomePage />)
  await ready()
  await waitFor(() => expect(app.share).not.toBeNull())
  fireEvent.click(screen.getByText('Blood pressure'))
  expect(isOpen()).toBe(true)
  expect(drBody()).toContain('146/88')
  fireEvent.click(screen.getByRole('button', { name: 'Close', hidden: true }))
  expect(isOpen()).toBe(false)
  act(() => { app.togglePause() })
  // Well before the slide-out timer: the reset, not the timer, cleared it.
  expect(drBody()).not.toContain('146/88')
  expect(document.body.innerHTML).not.toMatch(/146\/88/)
})

test('a closed drawer drops its body once the slide-out has finished', () => {
  vi.useFakeTimers()
  try {
    function Opener() {
      const d = useDrawer()
      return <><button onClick={() => d.open('BP', <p>146/88</p>)}>open</button><button onClick={d.close}>shut</button></>
    }
    render(<DrawerProvider><Opener /></DrawerProvider>)
    fireEvent.click(screen.getByText('open'))
    fireEvent.click(screen.getByText('shut'))
    // Still there while it slides out.
    expect(drBody()).toContain('146/88')
    act(() => { vi.advanceTimersByTime(DRAWER_SLIDE_MS) })
    expect(drBody()).toBe('')
    expect(document.getElementById('drawer')!.querySelector('h3')!.textContent).toBe('')
  } finally {
    vi.useRealTimers()
  }
})

test('under reduced motion the body is dropped as soon as the drawer closes', () => {
  const mm = vi.fn().mockReturnValue({ matches: true })
  vi.stubGlobal('matchMedia', mm)
  try {
    function Opener() {
      const d = useDrawer()
      return <><button onClick={() => d.open('BP', <p>146/88</p>)}>open</button><button onClick={d.close}>shut</button></>
    }
    render(<DrawerProvider><Opener /></DrawerProvider>)
    fireEvent.click(screen.getByText('open'))
    fireEvent.click(screen.getByText('shut'))
    expect(drBody()).toBe('')
  } finally {
    vi.unstubAllGlobals()
  }
})

test('an open drawer closes and empties when heart is revoked for the viewer', async () => {
  renderApp(<HomePage />)
  await ready()
  await waitFor(() => expect(app.share).not.toBeNull())
  fireEvent.click(screen.getByText('Blood pressure'))
  expect(isOpen()).toBe(true)
  expect(drBody()).toContain('146/88')
  act(() => { app.toggleShare('james', 'heart') })
  expect(isOpen()).toBe(false)
  expect(drBody()).toBe('')
  expect(document.body.innerHTML).not.toMatch(/146\/88/)
})

test('switching viewer (Preview as) closes and empties an open drawer', async () => {
  renderApp(<HomePage />)
  await ready()
  await waitFor(() => expect(app.share).not.toBeNull())
  fireEvent.click(screen.getByText('Blood pressure'))
  expect(drBody()).toContain('146/88')
  act(() => { app.setViewer('sarah') })
  expect(isOpen()).toBe(false)
  expect(drBody()).toBe('')
})

test('a route change (including browser Back) closes and empties the drawer', () => {
  function Page() {
    const d = useDrawer()
    const nav = useNavigate()
    return (
      <>
        <button onClick={() => d.open('BP', <p>146/88</p>)}>open</button>
        <button onClick={() => nav('/individual/health')}>go</button>
        <button onClick={() => nav(-1)}>back</button>
      </>
    )
  }
  renderApp(<Page />)
  fireEvent.click(screen.getByText('open'))
  expect(isOpen()).toBe(true)
  // The drawer marks .wrap inert; navigation here stands in for a link or the browser.
  document.querySelector('.wrap')!.removeAttribute('inert')
  fireEvent.click(screen.getByText('go'))
  expect(isOpen()).toBe(false)
  expect(drBody()).toBe('')

  fireEvent.click(screen.getByText('open'))
  document.querySelector('.wrap')!.removeAttribute('inert')
  fireEvent.click(screen.getByText('back'))
  expect(isOpen()).toBe(false)
  expect(drBody()).toBe('')
})

test('each opening starts fresh: "Ask her about it" is not already "Added" in the next drawer', () => {
  const kpi = (label: string, value: string): Kpi => ({ label, value, unit: '', spark: [1, 2, 3], sub: 'usual', delta: 'd', tone: 'good', color: '#000' }) as unknown as Kpi
  function Openers() {
    const d = useDrawer()
    return (
      <>
        <button onClick={() => d.open('A', <KpiDrawerBody kpi={kpi('Blood pressure', '146/88')} />)}>openA</button>
        <button onClick={() => d.open('B', <KpiDrawerBody kpi={kpi('Sleep', '6.2')} />)}>openB</button>
        <button onClick={() => d.close()}>shut</button>
      </>
    )
  }
  renderApp(<Openers />)
  fireEvent.click(screen.getByText('openA'))
  const ask = screen.getByText('🗣️ Ask her about it').closest('button')!
  fireEvent.click(ask)
  expect(document.querySelector<HTMLButtonElement>('#drBody .btn')!.disabled).toBe(true)
  fireEvent.click(screen.getByText('shut'))
  fireEvent.click(screen.getByText('openB'))
  const first = document.querySelector<HTMLButtonElement>('#drBody .btn')!
  expect(first.textContent).toBe('🗣️ Ask her about it')
  expect(first.disabled).toBe(false)
})
