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
vi.mock('@/features/individual/live/ring', async (orig) => ({
  ...(await orig<typeof import('@/features/individual/live/ring')>()), playDial000: () => playDial000(), playRing: () => Promise.resolve(),
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

test('one case: Night alert, read-only values and the rule, no presets or sliders', async () => {
  await render()
  expect(screen.getByText('Night alert')).toBeInTheDocument()
  expect(screen.getByText('137 bpm')).toBeInTheDocument()
  expect(screen.getByText('10 min')).toBeInTheDocument()
  expect(screen.getByText('Heart rate above 120 for 10 minutes while she is not moving')).toBeInTheDocument()
  expect(screen.queryByRole('slider')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Sound asleep' })).toBeNull()
})

test('Start runs stroke with HR 137 and 10 min still; the speech and David toggles are buttons', async () => {
  await render()
  const speech = within(screen.getByRole('group', { name: 'Speech' }))
  expect(speech.getByRole('button', { name: 'Slurred (auto)' })).toHaveAttribute('aria-pressed', 'true')
  click("I'll answer (mic)")
  expect(speech.getByRole('button', { name: "I'll answer (mic)" })).toHaveAttribute('aria-pressed', 'true')
  click('Start')
  expect(start).toHaveBeenCalledWith('stroke', { hr: 137, movementMin: 10, noReplySeconds: 25 })
})

const T0 = Date.parse('2026-10-14T14:30:00Z')
const at = (sec: number) => new Date(T0 + sec * 1000).toISOString()
const people: LivePeople = { person: null, members: {} }
const ev = (sec: number, actor: string, kind: string, text: string) => ({ at: at(sec), actor, kind, text })
function incidentAt(start: number, call: boolean): LiveIncidentValue {
  const timeline = [ev(start, 'SYSTEM', 'ALERT', 'Heart rate 137'), ...(call ? [
    ev(start + 60, 'david', 'ACCEPTED', 'David accepted'),
    ev(start + 60, 'SYSTEM', 'CALLED_115', 'Calling 000 automatically with the call script (demo call)'),
  ] : [])]
  const incident = {
    personId: 'margaret', status: 'ESCALATING', level: 'EMERGENCY', alert: { kind: 'HR_HIGH_NO_MOVEMENT', at: at(start), hr: 137 },
    timeline, assignments: [], ownerId: null, demo: { timerSeconds: 5, noReplySeconds: 25, clockOffsetMs: 0 },
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
