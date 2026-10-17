import { act, fireEvent, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { TopNav } from '@/components/shell/TopNav'
import { resetDataSource, setDataSource } from '@/data/repo'
import LIVE_COPY from '@/locales/en/live.json'
import { mockSource } from '@/data/sources/mock'
import { STEPS, TICK_MS } from '@/domain/emergency'
import { LivePage } from '@/features/individual/live/LivePage'
import { PAGE_REGISTRY } from '@/features/registry'
import { mockCanvas, mockLayout, mockRaf } from '../../canvas/fakeCtx'
import { renderWithProviders } from '../../helpers/renderWithProviders'

// Only the timers the demo owns: the canvas animation-frame loop is not one of them.
const TIMERS: ('setTimeout' | 'clearTimeout' | 'setInterval' | 'clearInterval')[] = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']
let mockPath = '/individual/live/'
const push = vi.fn((to: string) => { mockPath = to })
vi.mock('@/app/navigation', () => ({ usePathname: () => mockPath, useRouter: () => ({ push, replace: vi.fn() }) }))

beforeEach(() => {
  mockCanvas()
  mockLayout()
  mockRaf()
  mockPath = '/individual/live/'
  push.mockClear()
  document.body.className = ''
  document.body.insertAdjacentHTML('beforeend', '<div id="flash" class="flash"></div>')
})
afterEach(() => {
  resetDataSource()
  vi.useRealTimers()
  document.getElementById('flash')?.remove()
})

const Both = () => (<><TopNav /><LivePage /></>)
const idle = () => screen.findByRole('heading', { name: 'No active alert' })
const start = () => fireEvent.click(screen.getByRole('button', { name: LIVE_COPY.idle.run }))
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next step' }))

test('is registered for individual/live', () => {
  expect(PAGE_REGISTRY['individual/live']).toBe(LivePage)
})

test('idle state: no alert, the copy and a run button', async () => {
  renderWithProviders(<LivePage />)
  await idle()
  expect(screen.getByText(/37 alerts in the community this week, 29 filtered as false alarms/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Run the 02:03 night alert demo' })).toBeInTheDocument()
  expect(screen.queryByText('Live timeline')).toBeNull()
  expect(document.body.classList.contains('night')).toBe(false)
})

test('starting shows the three cards, body.night and the first step', async () => {
  renderWithProviders(<LivePage />)
  await idle()
  act(() => start())
  expect(document.body).toHaveClass('night')
  expect(screen.queryByRole('heading', { name: 'No active alert' })).toBeNull()
  expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual(['Live timeline', "Margaret's screen"])
  expect(screen.getAllByText('Checking')).toHaveLength(2) // tag and level
  expect(screen.getByText('0′')).toBeInTheDocument()
  expect(screen.getByText('since alert')).toBeInTheDocument()
  expect(screen.getByText('Heart rate 142, not moving')).toBeInTheDocument()
  expect(screen.getByText('David · not yet alerted')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Care circle in emergency: help moving toward Margaret' })).toBeInTheDocument()
  expect(document.querySelectorAll('#tl li')).toHaveLength(10)
  expect(document.querySelectorAll('#tl li.done')).toHaveLength(1)
  expect(document.querySelectorAll('#pDots i')).toHaveLength(10)
  expect(screen.getByRole('button', { name: 'Previous step' })).toHaveAttribute('aria-disabled', 'true')
  expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
  expect(document.querySelectorAll('#sla > div')).toHaveLength(5)
  expect(within(document.getElementById('devLive')!).getByText('Margaret…')).toBeInTheDocument()
  expect(within(document.getElementById('devLive')!).getByText('Hearing mode')).toBeInTheDocument()
  expect(within(document.getElementById('devLive')!).getByText('02:03')).toBeInTheDocument()
})

test('Next shows step 2 "Calls Margaret by voice" and pauses; keyboard-operable buttons', async () => {
  renderWithProviders(<LivePage />)
  await idle()
  act(() => start())
  const nextBtn = screen.getByRole('button', { name: 'Next step' })
  expect(nextBtn.tagName).toBe('BUTTON')
  nextBtn.focus()
  expect(nextBtn).toHaveFocus()
  fireEvent.click(nextBtn) // Enter on a focused button fires click
  expect(screen.getByText(/Calls Margaret by voice/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  expect(within(document.getElementById('devLive')!).getByText('Margaret, it\'s your check-in. Can you hear me?')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Previous step' })).toHaveAttribute('aria-disabled', 'false')
  expect(within(document.getElementById('devLive')!).getByRole('button', { name: 'Yes' })).toBeInTheDocument()
})

test('Next keeps keyboard focus at the last step and does nothing there (aria-disabled, not disabled)', async () => {
  renderWithProviders(<LivePage />)
  await idle()
  act(() => start())
  const nextBtn = screen.getByRole('button', { name: 'Next step' })
  nextBtn.focus()
  for (let i = 0; i < 9; i++) fireEvent.click(nextBtn)
  expect(document.querySelectorAll('#tl li')[9]).toHaveClass('cur')
  expect(nextBtn).toHaveAttribute('aria-disabled', 'true')
  expect(nextBtn).not.toBeDisabled()
  expect(nextBtn).toHaveFocus()
  fireEvent.click(nextBtn)
  expect(document.querySelectorAll('#tl li')[9]).toHaveClass('cur')
  const prev = screen.getByRole('button', { name: 'Previous step' })
  for (let i = 0; i < 9; i++) fireEvent.click(prev)
  prev.focus()
  fireEvent.click(prev)
  expect(document.querySelectorAll('#tl li')[0]).toHaveClass('cur')
  expect(prev).toHaveFocus()
})

test('Yes and No on her screen toast what Margaret said', async () => {
  renderWithProviders(<LivePage />)
  await idle()
  act(() => start())
  next()
  fireEvent.click(within(document.getElementById('devLive')!).getByRole('button', { name: 'No' }))
  expect(document.getElementById('toast')!.textContent).toBe('Margaret: No')
})

test('autoplay advances every 2800 ms and stops with Play shown at the last step', async () => {
  vi.useFakeTimers({ toFake: TIMERS })
  renderWithProviders(<LivePage />)
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  act(() => start())
  expect(document.querySelectorAll('#tl li.cur')).toHaveLength(1)
  act(() => { vi.advanceTimersByTime(TICK_MS) })
  expect(document.querySelectorAll('#tl li')[1]).toHaveClass('cur')
  act(() => { vi.advanceTimersByTime(TICK_MS * 20) })
  expect(document.querySelectorAll('#tl li')[9]).toHaveClass('cur')
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Next step' })).toHaveAttribute('aria-disabled', 'true')
  expect(screen.getAllByText('Help arrived')).toHaveLength(2)
  expect(vi.getTimerCount()).toBe(0) // no timer left running at the end
})

test('Play at the last step restarts from the first', async () => {
  renderWithProviders(<LivePage />)
  await idle()
  act(() => start())
  for (let i = 0; i < 9; i++) next()
  expect(document.querySelectorAll('#tl li')[9]).toHaveClass('cur')
  fireEvent.click(screen.getByRole('button', { name: 'Play' }))
  expect(document.querySelectorAll('#tl li')[0]).toHaveClass('cur')
  expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
})

test('owner and timeline carry forward; SLA fills in as steps pass', async () => {
  renderWithProviders(<LivePage />)
  await idle()
  act(() => start())
  const sla = () => Array.from(document.querySelectorAll('#sla > div b')).map((b) => b.textContent)
  expect(sla()).toEqual(['—', '—', '—', '—', '—'])
  for (let i = 0; i < 5; i++) next()
  expect(screen.getByText('David · on his way')).toBeInTheDocument()
  expect(sla()).toEqual(['41 s', '58 s', '1:12', '—', '—'])
  next() // step 6 omits own[0] and own[1]
  expect(screen.getByText('David · on his way')).toBeInTheDocument()
  expect(screen.getByText('Owns the case')).toBeInTheDocument()
  expect(screen.getByText('5′')).toBeInTheDocument()
  for (let i = 0; i < 3; i++) next()
  expect(sla()).toEqual(['41 s', '58 s', '1:12', '8 min', '14 min'])
  expect(screen.getByText('On the way to Camperdown')).toBeInTheDocument()
})

test('the flash overlay fires on step 0 only', async () => {
  vi.useFakeTimers({ toFake: TIMERS })
  renderWithProviders(<LivePage />)
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  const flash = document.getElementById('flash')!
  act(() => start())
  expect(flash.style.opacity).toBe('1')
  act(() => { vi.advanceTimersByTime(120) })
  expect(flash.style.transition).toBe('opacity 1.6s')
  expect(flash.style.opacity).toBe('0')
  expect(document.querySelector('#devLive .dev-flash')).toHaveClass('on')
  act(() => { vi.advanceTimersByTime(TICK_MS) })
  expect(document.querySelector('#devLive .dev-flash')).not.toHaveClass('on')
})

test('listen bars appear on the repeat-after-me step', async () => {
  renderWithProviders(<LivePage />)
  await idle()
  act(() => start())
  next(); next()
  expect(document.querySelectorAll('#devLive .listen i')).toHaveLength(5)
  expect(screen.getByText(/Please say after me/)).toBeInTheDocument()
})

test('Call 000 opens the script drawer; the other calls toast', async () => {
  renderWithProviders(<LivePage />)
  await idle()
  act(() => start())
  fireEvent.click(screen.getByRole('button', { name: 'Call Mum' }))
  expect(document.getElementById('toast')!.textContent).toBe('Calling Mum · captions on')
  fireEvent.click(screen.getByRole('button', { name: 'Call David' }))
  expect(document.getElementById('toast')!.textContent).toBe('Calling David')
  fireEvent.click(screen.getByRole('button', { name: 'Call 000' }))
  expect(await screen.findByText('Script for 000')).toBeInTheDocument()
  expect(screen.getByText('Margaret Collins, 78, lives alone')).toBeInTheDocument()
  expect(screen.getByText('Noa prepares this. A person makes the call.')).toBeInTheDocument()
})

test('End demo returns to idle, clears body.night and stops the clock', async () => {
  vi.useFakeTimers({ toFake: TIMERS })
  renderWithProviders(<LivePage />)
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  act(() => start())
  fireEvent.click(screen.getByRole('button', { name: 'End demo' }))
  expect(document.body.classList.contains('night')).toBe(false)
  expect(screen.getByRole('heading', { name: 'No active alert' })).toBeInTheDocument()
  expect(vi.getTimerCount()).toBe(0)
})

test('unmounting mid-demo leaves no timers and no night class', async () => {
  vi.useFakeTimers({ toFake: TIMERS })
  const r = renderWithProviders(<LivePage />)
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  act(() => start())
  r.unmount()
  expect(document.body.classList.contains('night')).toBe(false)
  expect(vi.getTimerCount()).toBe(0)
})

test('the demo runs while sharing is paused (safety stays visible)', async () => {
  vi.useFakeTimers({ toFake: TIMERS })
  const r = renderWithProviders(<LivePage />)
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  act(() => r.app().togglePause())
  expect(r.app().paused).toBe(true)
  act(() => start())
  expect(screen.getByText('Live timeline')).toBeInTheDocument()
  expect(document.querySelector('.locked')).toBeNull()
  act(() => { vi.advanceTimersByTime(TICK_MS * 3) })
  expect(document.querySelectorAll('#tl li')[3]).toHaveClass('cur')
  expect(screen.getByText('Suspected stroke signs')).toBeInTheDocument()
})

test('Night alert demo (TopNav) goes to the live page as family; body.night; End removes it', async () => {
  const r = renderWithProviders(<Both />, { who: 'self' })
  await idle()
  fireEvent.click(screen.getByRole('button', { name: /Night alert demo/ }))
  expect(push).toHaveBeenCalledWith('/individual/live')
  expect(r.app().who).toBe('family')
  expect(r.app().emergency).toMatchObject({ active: true, step: 0, playing: true })
  expect(document.body).toHaveClass('night')
  expect(screen.getByText('LIVE')).toBeInTheDocument()
  expect(screen.getByText('Live timeline')).toBeInTheDocument()
  // Tab to Next: it is a real, focusable button; Enter activates it.
  screen.getByRole('button', { name: 'Next step' }).focus()
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
  expect(screen.getByText(/Calls Margaret by voice/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'End demo' }))
  expect(document.body.classList.contains('night')).toBe(false)
  expect(screen.queryByText('LIVE')).toBeNull()
})

test('STEPS stay the single source for the timeline text', async () => {
  renderWithProviders(<LivePage />)
  await idle()
  act(() => start())
  const items = Array.from(document.querySelectorAll('#tl li'))
  expect(items).toHaveLength(STEPS.length)
  expect(items[3].textContent).toContain('Triage.')
  expect(items[3].textContent).toContain('Level: emergency now')
})

describe.each([
  ['never resolves', () => new Promise<never>(() => {})],
  ['rejects', () => Promise.reject(new Error('scene unavailable'))],
])('safety controls when the orbit scene %s', (_name, load) => {
  test('End demo and Call 000 work without the orbit', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    setDataSource({ ...mockSource, getOrbitScene: load })
    renderWithProviders(<LivePage />)
    await idle()
    act(() => start())
    expect(screen.getByText('David · not yet alerted')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: LIVE_COPY.orbitLabel })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Call 000' }))
    expect(await screen.findByText('Script for 000')).toBeInTheDocument()
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    expect(unhandled).not.toHaveBeenCalled()
    process.off('unhandledRejection', unhandled)
    fireEvent.click(screen.getByRole('button', { name: 'End demo' }))
    expect(screen.getByRole('heading', { name: 'No active alert' })).toBeInTheDocument()
  })
})
