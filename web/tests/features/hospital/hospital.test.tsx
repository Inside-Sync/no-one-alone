import { act, fireEvent, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import i18n from '@/i18n'
import { EdPage } from '@/features/hospital/ed/EdPage'
import { PAGE_REGISTRY } from '@/features/registry'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/hospital/ed/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const idle = async () => {}
const liveValue: LiveIncidentValue = {
  live: false, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
  start: idle, reset: idle, checkin: idle, act: idle, recover: idle,
  get recovery() { return this.incident?.recovery },
}
vi.mock('@/state/LiveIncident', () => ({ useLiveIncident: () => liveValue }))

const opts = { who: 'family' as const }
const goto = (r: { app: () => { dispatchEmergency: (a: { type: 'start' } | { type: 'goto'; step: number } | { type: 'tick' }) => void } }, step: number) =>
  act(() => { r.app().dispatchEmergency({ type: 'start' }); r.app().dispatchEmergency({ type: 'goto', step }) })

test('hospital/ed and hospital/overview are registered; panel, demand, discharge, patient and loop are no longer routed pages', () => {
  expect(PAGE_REGISTRY['hospital/ed']).toBe(EdPage)
  expect(PAGE_REGISTRY['hospital/overview']).toBeDefined()
  for (const p of ['panel', 'demand', 'discharge', 'patient', 'loop']) expect(PAGE_REGISTRY['hospital/' + p]).toBeUndefined()
})

describe('ed', () => {
  const ready = () => screen.findByText('Pre-arrival inbox')

  test('shows every section in prototype order and span', async () => {
    renderWithProviders(<EdPage />, opts)
    await ready()
    expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual([
      'Pre-arrival inbox', 'Incoming ambulances', 'Packet', 'Stroke pathway',
    ])
    expect(Array.from(document.querySelector('main')!.children).map((c) => c.className.match(/c\d+/)?.[0])).toEqual(['c12', 'c7', 'c5'])
    expect(document.querySelectorAll('.kpis .kpi')).toHaveLength(6)
    expect(screen.queryByText('Locked')).not.toBeInTheDocument()
  })

  test('before the demo: example packet, no new pill, three incoming rows', async () => {
    renderWithProviders(<EdPage />, opts)
    await ready()
    expect(screen.getByText('Badriya K., 91 (example)')).toBeInTheDocument()
    expect(screen.getByText("Run the night alert demo to watch Moza's packet arrive.")).toBeInTheDocument()
    expect(screen.getByText('Select a stroke packet')).toBeInTheDocument()
    expect(document.querySelectorAll('#incoming tr')).toHaveLength(3)
    expect(document.querySelectorAll('#pathway .bx.on')).toHaveLength(0)
    expect(document.querySelectorAll('#pathway em')[0]).toHaveTextContent('pending')
  })

  test('selecting an inbox item shows its packet', async () => {
    const r = renderWithProviders(<EdPage />, opts)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: /Salem K\., 82/ }))
    const pane = document.getElementById('packet2')!
    expect(within(pane).getByText('Chest pain · arrived 23:40')).toBeInTheDocument()
    expect(within(pane).getByText('Handled. Packet archived.')).toBeInTheDocument()
    goto(r, 7)
    fireEvent.click(screen.getByRole('button', { name: /Moza H\., 78/ }))
    expect(within(document.getElementById('packet2')!).getByText('Penicillin')).toBeInTheDocument()
    expect(within(document.getElementById('packet2')!).getByText('Female, 78 · DOB 03/03/1948 · 162 cm, 61 kg · O+')).toBeInTheDocument()
  })

  test('inbox pill appears only after emergency reaches step index 7', async () => {
    const r = renderWithProviders(<EdPage />, opts)
    await ready()
    goto(r, 6)
    expect(screen.queryByText('1 new')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Moza H\./ })).not.toBeInTheDocument()
    act(() => r.app().dispatchEmergency({ type: 'next' }))
    expect(screen.getByText('1 new')).toHaveClass('pill', 'bad')
    const msg = screen.getByRole('button', { name: /Moza H\., 78/ })
    expect(msg).toHaveClass('new')
    expect(msg).toHaveTextContent('Suspected stroke · ETA 14 min')
    expect(document.querySelectorAll('#incoming tr')).toHaveLength(4)
    expect(screen.getByText('Window closes 06:25 · 4 h 18 min left')).toBeInTheDocument()
    expect(document.querySelectorAll('#pathway .bx.on')).toHaveLength(5)
    act(() => r.app().dispatchEmergency({ type: 'goto', step: 8 }))
    expect(document.querySelectorAll('#pathway .bx.on')).toHaveLength(8)
    act(() => r.app().dispatchEmergency({ type: 'goto', step: 9 }))
    expect(msg).toHaveTextContent('Suspected stroke · ETA arriving now')
    act(() => r.app().dispatchEmergency({ type: 'end' }))
    expect(screen.queryByText('1 new')).not.toBeInTheDocument()
  })

  test('page stroke team and divert fire once', async () => {
    renderWithProviders(<EdPage />, opts)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Page stroke team' }))
    expect(screen.getByRole('button', { name: '✓ Paged' })).toBeDisabled()
    expect(screen.getByText('Stroke team paged · CT 2 on hold')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Divert' }))
    expect(screen.getByRole('button', { name: '✓ Diversion sent' })).toBeDisabled()
  })

  test('a failed hospital load shows the page error card without throwing', async () => {
    const repo = await import('@/data/repo')
    const spy = vi.spyOn(repo, 'getHospital').mockRejectedValue(new Error('offline'))
    try {
      renderWithProviders(<EdPage />, opts)
      expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('common:pageError.text'))
      expect(document.querySelector('#edKpis')).toBeNull()
    } finally {
      spy.mockRestore()
    }
  })
})
