import { act, render } from '@testing-library/react'
import { vi } from 'vitest'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { AppStateProvider, useAppState, type AppStateValue } from '@/state/AppState'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/live/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const idle = async () => {}
const base = {
  live: true, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
  start: idle, reset: idle, checkin: idle, act: idle, recover: idle,
} as unknown as LiveIncidentValue
let live = base
vi.mock('@/state/LiveIncident', () => ({ useLiveIncident: () => live }))
const open = (id: string, isOpen = true) => ({ ...base, view: { id, open: isOpen } }) as unknown as LiveIncidentValue
let state!: AppStateValue
function Probe({ onState }: { onState: (s: AppStateValue) => void }) { onState(useAppState()); return null }
const tree = () => <AppStateProvider><Probe onState={(s) => { state = s }} /></AppStateProvider>
const mount = () => { const r = render(tree()); return { app: () => state, rerender: () => r.rerender(tree()) } }
const night = () => document.body.classList.contains('night')

test('Night alert demo: night stays on through the reset of the old incident until the new one opens', () => {
  live = open('old')
  const { app, rerender } = mount()
  expect(night()).toBe(true)
  act(() => app().holdNight(true))
  live = base // the old incident is reset
  rerender()
  expect(night()).toBe(true)
  live = open('new')
  rerender()
  expect(night()).toBe(true)
  live = open('new', false) // the new incident closes: the hold is over, day again
  rerender()
  expect(night()).toBe(false)
})

test('a failed start lets the day come back', () => {
  live = base
  const { app } = mount()
  act(() => app().holdNight(true))
  expect(night()).toBe(true)
  act(() => app().holdNight(false))
  expect(night()).toBe(false)
})
