import { act, fireEvent, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import i18n from '@/i18n'
import ar from '@/locales/ar/data/overview.json'
import en from '@/locales/en/data/overview.json'
import { OverviewPage } from '@/features/hospital/overview/OverviewPage'
import { mockCanvas, mockLayout, mockRaf } from '../../canvas/fakeCtx'
import { renderWithProviders } from '../../helpers/renderWithProviders'

const push = vi.fn()
vi.mock('@/app/navigation', () => ({ usePathname: () => '/hospital/overview/', useRouter: () => ({ push, replace: vi.fn() }) }))

const opts = { who: 'family' as const }
const spans = () => Array.from(document.querySelector('main')!.children).map((c) => c.className.match(/c\d+/)?.[0])
const headings = () => Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)

beforeEach(() => {
  mockCanvas()
  mockLayout()
  mockRaf()
  push.mockClear()
})

test('English and Arabic overview data have the same shape and the same numbers', () => {
  const shape = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(shape) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v === 'string' ? 's' : v
  const numbers = (j: typeof en) => [j.overview.departments.map((d) => [d.used, d.total, d.onShift]), j.overview.conditions.map((c) => [c.patients, c.inTime.pct, c.recovered.pct]), j.overview.capacity.lines.map((l) => [l.used, l.total])]
  expect(shape(ar)).toEqual(shape(en))
  expect(numbers(ar)).toEqual(numbers(en))
})

describe('overview', () => {
  const ready = () => screen.findByText('Departments and capacity')

  test('shows six KPIs, then the cards in the order of the design', async () => {
    renderWithProviders(<OverviewPage />, opts)
    await ready()
    expect(document.querySelectorAll('.kpis .kpi')).toHaveLength(6)
    expect(headings()).toEqual([
      'Capacity and effectiveness', 'Today', 'Departments and capacity', 'Treatment and recovery · last 90 days', 'By condition',
      'Open care loops', 'Needs a person now', 'From patients and labs', 'Where every case is', 'Clinic slots this week',
    ])
    expect(spans()).toEqual(['c12', 'c12', 'c12', 'c12', 'c12', 'c12', 'c12', 'c8', 'c4', 'c6', 'c6', 'c12'])
    expect(document.querySelector('[data-tour="departments"]')).toHaveTextContent('Departments and capacity')
  })

  test('capacity: 87% is the right amount, Outpatient clinics and Thursday are over, effectiveness is 85', async () => {
    renderWithProviders(<OverviewPage />, opts)
    await ready()
    const card = document.getElementById('capEff')!
    expect(card.querySelector('.ce-h b')).toHaveTextContent('87%')
    expect(within(card).getByText('156 of 180 beds in use')).toBeInTheDocument()
    const rows = Array.from(card.querySelectorAll('.ce-rows li')).slice(0, 4)
    expect(rows.map((r) => r.querySelector('.pill')!.textContent)).toEqual(['Right amount', 'Right amount', 'Over capacity', 'Over capacity'])
    expect(rows.map((r) => r.querySelector('.hp-bar b')!.textContent)).toEqual(['87%', '87%', '91%', '94%'])
    expect(card.querySelectorAll('.ce-h b')[1]).toHaveTextContent('85')
    expect(within(card).getByText('out of 100 · Abu Dhabi average 75 · highest of the 8 largest facilities')).toBeInTheDocument()
    expect(within(card).getByRole('img', { name: 'Capacity meter: 87% in use' })).toBeInTheDocument()
  })

  test('departments: patients per doctor and capacity status are worked out from the numbers', async () => {
    renderWithProviders(<OverviewPage />, opts)
    await ready()
    const rows = Array.from(document.querySelectorAll('#depRows tr'))
    expect(rows).toHaveLength(8)
    const cell = (i: number, c: number) => rows[i].querySelectorAll('td')[c].textContent
    expect(cell(0, 5)).toBe('6.5')
    expect(cell(1, 5)).toBe('5.5')
    expect(cell(7, 5)).toBe('11.9')
    expect(rows.map((r) => r.querySelector('.pill')!.textContent)).toEqual(['Right amount', 'Over', 'Right amount', 'Over', 'Over', 'Right amount', 'Right amount', 'Over'])
    expect(cell(1, 3)).toBe('Dr Sara Al Mazrouei')
  })

  test('by condition: six conditions, a dash for the readmission of new diabetes', async () => {
    renderWithProviders(<OverviewPage />, opts)
    await ready()
    const rows = Array.from(document.querySelectorAll('#conRows tr'))
    expect(rows).toHaveLength(6)
    expect(rows[0]).toHaveTextContent('Clot-busting within 60 minutes')
    expect(rows[0].querySelectorAll('td')[4]).toHaveTextContent('5.6%')
    expect(rows[5].querySelectorAll('td')[4]).toHaveTextContent('—')
  })
})

describe('the screening-loop cards', () => {
  const ready = () => screen.findByText('Needs a person now')

  test('cases, feed, steps and slots are all there', async () => {
    renderWithProviders(<OverviewPage />, opts)
    await ready()
    expect(document.querySelectorAll('#loopRows tr')).toHaveLength(5)
    expect(document.querySelectorAll('#loopSteps > div')).toHaveLength(6)
    expect(document.querySelectorAll('#loopSlots > div')).toHaveLength(5)
    expect(document.querySelectorAll('#loopSug li')).toHaveLength(2)
    expect(screen.getByText(/Owners and deadlines are set by programme rules/)).toBeInTheDocument()
  })

  test('cases are sorted by deadline, with the late ones first and the urgent one due soon', async () => {
    renderWithProviders(<OverviewPage />, opts)
    await ready()
    const names = Array.from(document.querySelectorAll('#loopRows tr')).map((r) => r.querySelector('b')!.textContent)
    expect(names).toEqual(['Fatma Al Dhaheri', 'Ahmed Rashid', 'Joseph Santos', 'Priya Nair', 'Ravi Menon'])
    const due = Array.from(document.querySelectorAll('#loopRows .due')).map((d) => d.textContent)
    expect(due[0]).toBe('1d 2h late')
    expect(due[1]).toBe('22h 00m late')
    expect(due[2]).toBe('in 42m 00s')
    expect(due[3]).toBe('in 5h 10m')
    expect(due[4]).toBe('in 3d 0h')
    expect(document.querySelectorAll('#loopRows .due.over')).toHaveLength(2)
    expect(document.querySelectorAll('#loopRows .due.soon')).toHaveLength(1)
  })

  test('a case action toasts, marks the row done and adds a feed line', async () => {
    renderWithProviders(<OverviewPage />, opts)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm doctor called' }))
    expect(screen.getByRole('status')).toHaveTextContent('Confirmed. He is being seen today.')
    const row = screen.getByText('Joseph Santos').closest('tr')!
    expect(row).toHaveClass('done')
    expect(within(row).getByText('Done')).toBeInTheDocument()
    expect(within(row).queryByRole('button')).toBeNull()
    expect(document.querySelector('#loopFeed li')).toHaveTextContent('YOU')
    expect(document.querySelector('#loopFeed li')).toHaveTextContent('Confirm doctor called · Joseph Santos')
  })

  test('the clock counts the deadlines down and the feed streams', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    try {
      renderWithProviders(<OverviewPage />, opts)
      await vi.waitFor(() => expect(document.querySelectorAll('#loopRows tr')).toHaveLength(5))
      await act(async () => {})
      const feedBefore = document.querySelector('#loopFeed li')!.textContent
      act(() => { vi.advanceTimersByTime(5000) })
      const dues = Array.from(document.querySelectorAll('#loopRows .due')).map((d) => d.textContent)
      expect(dues[2]).toBe('in 41m 55s')
      expect(document.querySelector('#loopFeed li')!.textContent).not.toBe(feedBefore)
      expect(document.querySelectorAll('#loopFeed li').length).toBeLessThanOrEqual(6)
    } finally {
      vi.useRealTimers()
    }
  })

  test('slot suggestions lock after one Approve; "Open results to review" goes to the review page', async () => {
    renderWithProviders(<OverviewPage />, opts)
    await ready()
    const approve = screen.getAllByRole('button', { name: 'Approve' })
    expect(approve).toHaveLength(2)
    fireEvent.click(approve[0])
    expect(screen.getByRole('status')).toHaveTextContent('Approved · Noa updates the booking options')
    expect(screen.getByRole('button', { name: '✓ Approved' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Open results to review' }))
    expect(push).toHaveBeenCalledWith('/hospital/review')
  })
})

describe('Arabic', () => {
  afterEach(async () => { await i18n.changeLanguage('en') })

  test('the overview renders in Arabic with the same structure', async () => {
    await i18n.changeLanguage('ar')
    renderWithProviders(<OverviewPage />, opts)
    await screen.findByText('الأقسام والسعة')
    expect(document.querySelectorAll('.kpis .kpi')).toHaveLength(6)
    expect(document.querySelectorAll('#depRows tr')).toHaveLength(8)
    expect(document.querySelectorAll('#conRows tr')).toHaveLength(6)
    expect(document.querySelectorAll('#loopRows tr')).toHaveLength(5)
    expect(screen.getByText('فاطمة الظاهري')).toBeInTheDocument()
  })
})
