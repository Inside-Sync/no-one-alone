import { act, fireEvent, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import i18n from '@/i18n'
import { DemandPage } from '@/features/hospital/demand/DemandPage'
import { DischargePage } from '@/features/hospital/discharge/DischargePage'
import { EdPage } from '@/features/hospital/ed/EdPage'
import { PanelPage } from '@/features/hospital/panel/PanelPage'
import { PAGE_REGISTRY } from '@/features/registry'
import type { IncidentDoc } from '@/data/contract'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/hospital/ed/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const idle = async () => {}
const liveValue: LiveIncidentValue = {
  live: false, loading: false, error: null, incident: null, people: { person: null, members: {} }, view: null,
  start: idle, reset: idle, checkin: idle, act: idle, recover: idle,
}
vi.mock('@/state/LiveIncident', () => ({ useLiveIncident: () => liveValue }))

const opts = { who: 'family' as const }
const goto = (r: { app: () => { dispatchEmergency: (a: { type: 'start' } | { type: 'goto'; step: number } | { type: 'tick' }) => void } }, step: number) =>
  act(() => { r.app().dispatchEmergency({ type: 'start' }); r.app().dispatchEmergency({ type: 'goto', step }) })

test('pages are registered for hospital/ed, panel, demand and discharge', () => {
  expect(PAGE_REGISTRY['hospital/ed']).toBe(EdPage)
  expect(PAGE_REGISTRY['hospital/panel']).toBe(PanelPage)
  expect(PAGE_REGISTRY['hospital/demand']).toBe(DemandPage)
  expect(PAGE_REGISTRY['hospital/discharge']).toBe(DischargePage)
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
    expect(screen.getByText('Beatrice K., 91 (example)')).toBeInTheDocument()
    expect(screen.getByText("Run the night alert demo to watch Margaret's packet arrive.")).toBeInTheDocument()
    expect(screen.getByText('Select a stroke packet')).toBeInTheDocument()
    expect(document.querySelectorAll('#incoming tr')).toHaveLength(3)
    expect(document.querySelectorAll('#pathway .bx.on')).toHaveLength(0)
    expect(document.querySelectorAll('#pathway em')[0]).toHaveTextContent('pending')
  })

  test('selecting an inbox item shows its packet', async () => {
    const r = renderWithProviders(<EdPage />, opts)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: /Kostas P\., 82/ }))
    const pane = document.getElementById('packet2')!
    expect(within(pane).getByText('Chest pain · arrived 23:40')).toBeInTheDocument()
    expect(within(pane).getByText('Handled. Packet archived.')).toBeInTheDocument()
    goto(r, 7)
    fireEvent.click(screen.getByRole('button', { name: /Margaret C\., 78/ }))
    expect(within(document.getElementById('packet2')!).getByText('Penicillin')).toBeInTheDocument()
    expect(within(document.getElementById('packet2')!).getByText('Female, 78 · DOB 03/03/1948 · 162 cm, 61 kg · O+')).toBeInTheDocument()
  })

  test('inbox pill appears only after emergency reaches step index 7', async () => {
    const r = renderWithProviders(<EdPage />, opts)
    await ready()
    goto(r, 6)
    expect(screen.queryByText('1 new')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Margaret C\./ })).not.toBeInTheDocument()
    act(() => r.app().dispatchEmergency({ type: 'next' }))
    expect(screen.getByText('1 new')).toHaveClass('pill', 'bad')
    const msg = screen.getByRole('button', { name: /Margaret C\., 78/ })
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

describe('panel', () => {
  const ready = () => screen.findByText('Older patients in the catchment')

  test('panel sorted by 30-day admission risk desc', async () => {
    renderWithProviders(<PanelPage />, opts)
    await ready()
    const rows = Array.from(document.querySelectorAll('#panelRows tr'))
    expect(rows).toHaveLength(10)
    const risks = rows.map((tr) => parseFloat(tr.querySelectorAll('td')[2].textContent!))
    expect(risks).toEqual([...risks].sort((a, b) => b - a))
    expect(rows[0]).toHaveTextContent('Eleni P.')
    expect(rows[0]).toHaveTextContent('84 · F')
    expect(rows[2]).toHaveTextContent('82 · M')
  })

  test('scatter draws 120 sampled dots and rings Margaret', async () => {
    renderWithProviders(<PanelPage />, opts)
    await ready()
    expect(screen.getByText('1,846 patients · sample of 120 shown')).toBeInTheDocument()
    const svg = screen.getByRole('img', { name: /Scatter of 30-day admission risk against age/ })
    expect(svg.querySelectorAll('circle[r="3.2"]')).toHaveLength(120)
    expect(svg.querySelectorAll('circle[r="6"]')).toHaveLength(1)
    expect(within(svg as unknown as HTMLElement).getByText('Margaret')).toBeInTheDocument()
    expect(document.querySelectorAll('#scatter ~ .legend span')).toHaveLength(3)
    expect(screen.getByText('Clinicians see named patients only where the patient consented to hospital sharing.')).toBeInTheDocument()
  })

  test('a row opens the hospital drawer with its actions', async () => {
    renderWithProviders(<PanelPage />, opts)
    await ready()
    fireEvent.click(document.querySelector('#panelRows tr')!)
    const dlg = await screen.findByRole('dialog')
    expect(within(dlg).getByText('Heart failure: +2.1 kg in 72 h')).toBeInTheDocument()
    expect(within(dlg).getByRole('button', { name: 'Open full chart' })).toBeInTheDocument()
    expect(within(dlg).getByRole('button', { name: 'Message GP' })).toBeInTheDocument()
  })
})

describe('demand', () => {
  const ready = () => screen.findByText('Presentations aged 75+, next 14 days')

  test('forecast, beds, drivers and actions in order and span', async () => {
    renderWithProviders(<DemandPage />, opts)
    await ready()
    expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual([
      'Presentations aged 75+, next 14 days', 'Beds right now', "What drives Thursday's spike", 'Suggested actions',
    ])
    expect(Array.from(document.querySelector('main')!.children).map((c) => c.className.match(/c\d+/)?.[0])).toEqual(['c8', 'c4', 'c6', 'c6'])
    expect(screen.getByText('FORECAST')).toHaveClass('tag')
    const svg = screen.getByRole('img', { name: /34 on Thursday and 31 on Friday/ })
    expect(svg.querySelectorAll('circle[r="5"]')).toHaveLength(3)
  })

  test('beds are coloured by occupancy', async () => {
    renderWithProviders(<DemandPage />, opts)
    await ready()
    const bars = Array.from(document.querySelectorAll('#beds .tr i')) as HTMLElement[]
    expect(bars.map((b) => b.style.background)).toEqual(['rgb(217, 68, 63)', 'rgb(217, 68, 63)', 'rgb(217, 68, 63)', 'rgb(31, 179, 156)', 'rgb(200, 138, 5)'])
    expect(screen.getByText('38/42')).toBeInTheDocument()
  })

  test('drivers show signed contributions', async () => {
    renderWithProviders(<DemandPage />, opts)
    await ready()
    const rows = document.querySelectorAll('#demandShap > div')
    expect(rows).toHaveLength(6)
    expect(rows[0]).toHaveTextContent('+8.1')
    expect(rows[3]).toHaveTextContent('−2.4')
  })

  test('Approve locks after a click, Linked only toasts', async () => {
    renderWithProviders(<DemandPage />, opts)
    await ready()
    fireEvent.click(screen.getAllByRole('button', { name: 'Approve' })[0])
    expect(screen.getByText('Open 6 surge beds in short stay · approved')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✓ Approved' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Linked' }))
    expect(screen.getByRole('button', { name: 'Linked' })).toBeEnabled()
  })
})

describe('discharge', () => {
  test('board lists eight patients with follow-up chips', async () => {
    renderWithProviders(<DischargePage />, opts)
    await screen.findByText('30-day follow-up board')
    expect(document.querySelectorAll('.kpis .kpi')).toHaveLength(6)
    const rows = document.querySelectorAll('#board tr')
    expect(rows).toHaveLength(8)
    expect(rows[3].querySelectorAll('td.st i')[2]).toHaveTextContent('↑')
    expect(rows[2].querySelectorAll('td.st i')[1]).toHaveTextContent('!')
    expect(document.querySelectorAll('.tw ~ .legend span')).toHaveLength(4)
  })

  test('board leads with Margaret only once the live incident has a recovery plan', async () => {
    const { unmount } = renderWithProviders(<DischargePage />, opts)
    await screen.findByText('30-day follow-up board')
    expect(screen.queryByText('Margaret C., 78')).toBeNull()
    unmount()
    liveValue.incident = { recovery: { createdAt: '2026-10-16T22:00:00Z', diagnosis: 'Ischaemic stroke' } } as unknown as IncidentDoc
    try {
      renderWithProviders(<DischargePage />, opts)
      await screen.findByText('30-day follow-up board')
      const rows = document.querySelectorAll('#board tr')
      expect(rows).toHaveLength(9)
      expect(rows[0]).toHaveTextContent('Margaret C., 78')
      expect(rows[0]).toHaveTextContent('17 Oct')
      expect(rows[0]).toHaveTextContent('Ischaemic stroke')
      expect(rows[0]).toHaveTextContent('New')
    } finally {
      liveValue.incident = null
    }
  })
})
