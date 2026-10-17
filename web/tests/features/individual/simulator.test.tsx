import { act, fireEvent, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { vi } from 'vitest'
import type { IncidentDoc } from '@/data/contract'
import { liveView, type LivePeople } from '@/domain/incident'
import { LivePage } from '@/features/individual/live/LivePage'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { mockCanvas, mockLayout, mockRaf } from '../../canvas/fakeCtx'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/live/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const idle = async () => {}
const start = vi.fn<LiveIncidentValue['start']>(async () => {})
const idleValue: LiveIncidentValue = {
  live: true, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
  start: (s, o) => start(s, o), reset: idle, checkin: idle, act: idle, recover: idle,
}
let liveValue = idleValue
vi.mock('@/state/LiveIncident', () => ({ useLiveIncident: () => liveValue }))

let dialed: (() => void)[] = []
const playDial000 = vi.fn(() => new Promise<void>((r) => { dialed.push(r) }))
let rung: (() => void)[] = []
const playRing = vi.fn(() => new Promise<void>((r) => { rung.push(r) }))
vi.mock('@/features/individual/live/ring', async (orig) => ({
  ...(await orig<typeof import('@/features/individual/live/ring')>()), playDial000: () => playDial000(), playRing: () => playRing(),
}))
vi.mock('@/data/repo', async (orig) => ({ ...(await orig<typeof import('@/data/repo')>()), audioUrl: (p: string) => Promise.resolve(p) }))

let played: string[] = []

beforeEach(() => {
  mockCanvas()
  mockLayout()
  mockRaf()
  start.mockClear()
  liveValue = idleValue
  playDial000.mockClear()
  dialed = []
  playRing.mockClear()
  rung = []
  played = []
  vi.stubGlobal('Audio', vi.fn(function Audio(url: string) {
    return { play: () => { played.push(url); return new Promise(() => {}) }, pause: () => {}, addEventListener: () => {} }
  }))
})
afterEach(() => { vi.unstubAllGlobals() })

const render = async () => {
  renderWithProviders(<LivePage />)
  await screen.findByRole('heading', { name: 'Simulator' })
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

const TIMERS: ('setTimeout' | 'clearTimeout' | 'setInterval' | 'clearInterval')[] = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']
const beat = (ms: number) => act(async () => { vi.advanceTimersByTime(ms) })
const slide = (name: string, value: number) => fireEvent.change(screen.getByRole('slider', { name }), { target: { value: String(value) } })

describe('watch', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: TIMERS }) })
  afterEach(() => { vi.useRealTimers() })
  const mount = async () => {
    renderWithProviders(<LivePage />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByRole('heading', { name: 'Simulator' })).toBeInTheDocument()
  }

  test('Night emergency starts stroke once after 4 readings, with HR 142 and 10 min still', async () => {
    await mount()
    click('🌙 Night emergency')
    expect(screen.getByRole('button', { name: '🌙 Night emergency' })).toHaveAttribute('aria-pressed', 'true')
    await beat(3000)
    expect(start).not.toHaveBeenCalled()
    await beat(1000)
    expect(start).toHaveBeenCalledTimes(1)
    expect(start).toHaveBeenCalledWith('stroke', { hr: 142, movementMin: 10, noReplySeconds: 45 })
    await beat(10_000)
    click('▶️ Resume')
    await beat(5000)
    expect(start).toHaveBeenCalledTimes(1)
  })

  test('sliders: HR 140 and still 10 count up from the readings that are really high and still', async () => {
    await mount()
    slide('Heart rate', 140)
    slide('Not moving for', 10)
    expect(screen.getByText('140 bpm')).toBeInTheDocument()
    expect(screen.getByText('10 min ⚠️')).toBeInTheDocument()
    await beat(0)
    expect(start).not.toHaveBeenCalled()
    await beat(9000)
    expect(start).not.toHaveBeenCalled()
    await beat(1000)
    expect(start).toHaveBeenCalledTimes(1)
    expect(start.mock.calls[0][1]).toMatchObject({ hr: 140, movementMin: 10 })
  })

  test('Faster: the night preset fires after 4 readings of 250 ms', async () => {
    await mount()
    click('⏩ Faster')
    expect(screen.getByRole('button', { name: '🐢 Normal speed' })).toBeInTheDocument()
    click('🌙 Night emergency')
    await beat(750)
    expect(start).not.toHaveBeenCalled()
    await beat(250)
    expect(start).toHaveBeenCalledTimes(1)
  })

  test('locked: with an open incident the sliders are disabled and time never starts a run', async () => {
    liveValue = incidentAt(0, false)
    await mount()
    expect(screen.getByRole('slider', { name: 'Heart rate' })).toBeDisabled()
    expect(screen.getByRole('slider', { name: 'Not moving for' })).toBeDisabled()
    click('🌙 Night emergency')
    await beat(30_000)
    expect(start).not.toHaveBeenCalled()
    expect(screen.getByText('01:30')).toBeInTheDocument()
  })
})

test('the Speech toggle sits in More options and still flips', async () => {
  await render()
  const group = screen.getByRole('group', { name: 'Speech' })
  expect(group.closest('details')?.querySelector('summary')).toHaveTextContent('More options: who answers the phone')
  const speech = within(group)
  expect(speech.getByRole('button', { name: 'Slurred (auto)' })).toHaveAttribute('aria-pressed', 'true')
  click("I'll answer (mic)")
  expect(speech.getByRole('button', { name: "I'll answer (mic)" })).toHaveAttribute('aria-pressed', 'true')
})

const T0 = Date.parse('2026-10-14T14:30:00Z')
const at = (sec: number) => new Date(T0 + sec * 1000).toISOString()
const people: LivePeople = { person: null, members: {} }
const ev = (sec: number, actor: string, kind: string, text: string) => ({ at: at(sec), actor, kind, text })
function incidentAt(start: number, call: boolean, david = false): LiveIncidentValue {
  const timeline = [ev(start, 'SYSTEM', 'ALERT', 'Heart rate 137'),
    ...(david || call ? [ev(start + 30, 'SYSTEM', 'NOTIFIED', 'Calling David: Margaret may be having a stroke.')] : []), ...(call ? [
    ev(start + 60, 'david', 'ACCEPTED', 'David accepted'),
    ev(start + 60, 'SYSTEM', 'CALLED_115', 'Calling 000 automatically with the call script (demo call)'),
  ] : [])]
  const incident = {
    personId: 'margaret', status: 'ESCALATING', level: 'EMERGENCY', alert: { kind: 'HR_HIGH_NO_MOVEMENT', at: at(start), hr: 137 },
    timeline, assignments: [], ownerId: null, demo: { timerSeconds: 5, noReplySeconds: 45, clockOffsetMs: 0 },
  } as unknown as IncidentDoc
  return { ...idleValue, incident, view: liveView(`inc-${start}`, incident, people, T0 + start * 1000 + 70_000) }
}

function mountLive() {
  let bump = () => {}
  function Harness() {
    const [, setN] = useState(0)
    bump = () => setN((n) => n + 1)
    return <LivePage />
  }
  renderWithProviders(<Harness />)
  return (v: LiveIncidentValue) => act(async () => { liveValue = v; bump() })
}

test('000 call already on the timeline at load: transcript only, no dial and no audio', async () => {
  liveValue = incidentAt(0, true)
  mountLive()
  expect(await screen.findByText('000 call · demo call')).toBeInTheDocument()
  expect(screen.getByText(/Her brother David is on his way with a key/)).toBeInTheDocument()
  expect(playDial000).not.toHaveBeenCalled()
  expect(played.filter((u) => u.startsWith('/noa/000-'))).toEqual([])
})

test('a new 000 call dials once, then the dialogue starts; a second run in the same tab does the same once', async () => {
  const show = mountLive()
  await show(incidentAt(0, false))
  await show(incidentAt(0, true))
  expect(playDial000).toHaveBeenCalledTimes(1)
  expect(screen.getByText('Dialling 000…')).toBeInTheDocument()
  await act(async () => { dialed[0]() })
  expect(played.filter((u) => u.startsWith('/noa/000-'))).toEqual(['/noa/000-1.mp3'])
  expect(screen.getByText(/Emergency. Police, Fire or Ambulance/)).toBeInTheDocument()

  await show(idleValue)
  await show(incidentAt(600, false))
  await show(incidentAt(600, true))
  await show(incidentAt(600, true))
  expect(playDial000).toHaveBeenCalledTimes(2)
  expect(screen.getByText('Dialling 000…')).toBeInTheDocument()
  await act(async () => { dialed[1]() })
  expect(played.filter((u) => u.startsWith('/noa/000-'))).toEqual(['/noa/000-1.mp3', '/noa/000-1.mp3'])
})

test('an incident that arrives after the empty first snapshot, already holding the 000 call: no dial, no audio', async () => {
  liveValue = { ...idleValue, settled: false }
  const show = mountLive()
  await show(incidentAt(0, true))
  expect(playDial000).not.toHaveBeenCalled()
  expect(playRing).not.toHaveBeenCalled()
  expect(screen.getByText(/Her brother David is on his way with a key/)).toBeInTheDocument()
  expect(played.filter((u) => u.startsWith('/noa/000-'))).toEqual([])
})

test("the dial waits for David's ring to finish", async () => {
  const show = mountLive()
  await show(incidentAt(0, false))
  await show(incidentAt(0, false, true))
  expect(playRing).toHaveBeenCalledTimes(1)
  await show(incidentAt(0, true))
  expect(playDial000).not.toHaveBeenCalled()
  await act(async () => { rung[0]() })
  expect(playDial000).toHaveBeenCalledTimes(1)
})
