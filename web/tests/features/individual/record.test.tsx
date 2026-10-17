import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { RecordPage } from '@/features/individual/record/RecordPage'
import { PAGE_REGISTRY } from '@/features/registry'
import { renderWithProviders } from '../../helpers/renderWithProviders'
import i18n from '@/i18n'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/record/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const ready = () => screen.findByText('Encounters, 2023–2026')

test('is registered for individual/record', () => {
  expect(PAGE_REGISTRY['individual/record']).toBe(RecordPage)
})

test('record shows FHIR R4 and 46 encounters', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  expect(screen.getByText('FHIR R4', { selector: '.tag' })).toBeInTheDocument()
  expect(screen.getByText('46 encounters from 6 sources')).toBeInTheDocument()
  const svg = screen.getByRole('img', { name: /46 encounters from 2023 to 2026/ })
  expect(svg.querySelectorAll('circle')).toHaveLength(46)
  expect(svg.querySelectorAll('circle[r="6"]')).toHaveLength(2)
  expect(svg.querySelectorAll('circle[r="4.5"]')).toHaveLength(44)
  expect(within(svg as unknown as HTMLElement).getByText('fall · wrist')).toBeInTheDocument()
  expect(within(svg as unknown as HTMLElement).getByText('dizziness')).toBeInTheDocument()
  expect(within(svg as unknown as HTMLElement).getByText('now')).toBeInTheDocument()
  expect(within(svg as unknown as HTMLElement).getByText('2026')).toBeInTheDocument()
  expect(document.querySelectorAll('#enc ~ .legend span')).toHaveLength(5)
})

test('shows every section in prototype order and span', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual([
    'Encounters, 2023–2026', 'Medicines', 'Pathology trends', 'Hospital readiness', 'Data sources', 'After a hospital stay',
  ])
  const kids = Array.from(document.querySelector('main')!.children)
  expect(kids.map((c) => c.className.match(/c\d+/)?.[0])).toEqual(['c12', 'c8', 'c4', 'c6', 'c6', 'c7', 'c5'])
})

test('plain-language KPI tiles show the record totals', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  const tiles = document.querySelectorAll('.kpis .kpi')
  expect(tiles).toHaveLength(6)
  expect(tiles[0]).toHaveTextContent('Health records')
  expect(tiles[0]).toHaveTextContent('1,284')
  expect(tiles[1]).toHaveTextContent('46')
  expect(screen.getByText('Due by 7 Nov')).toBeInTheDocument()
})

test('medicines table, pill and allergy note', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  expect(screen.getByText('No interactions')).toHaveClass('pill', 'good')
  const rows = document.getElementById('meds')!.querySelectorAll('tr')
  expect(rows).toHaveLength(4)
  expect(rows[0]).toHaveTextContent('Amlodipine 5 mg')
  expect(within(rows[0] as HTMLElement).getByText('82%')).toHaveStyle({ color: 'var(--warn-text)' })
  expect(within(rows[1] as HTMLElement).getByText('96%')).toHaveStyle({ color: 'var(--good-text)' })
  const note = screen.getByText(/Interaction check run 14 Oct against all active medicines\./)
  expect(note.textContent).toBe('Allergy: penicillin (rash, 1998). Interaction check run 14 Oct against all active medicines.')
  expect(within(note).getByText('penicillin')).toHaveStyle({ color: 'var(--bad-text)' })
})

test('pathology minis flag eGFR out of range and shade the reference band', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  const labs = document.querySelectorAll('#labs .lab')
  expect(labs).toHaveLength(4)
  const egfr = labs[0]
  expect(egfr.querySelector('b')).toHaveTextContent('58')
  expect(egfr.querySelector('b')).toHaveStyle({ color: 'var(--warn-text)' })
  expect(egfr.querySelector('path')).toHaveAttribute('stroke', '#c88a05')
  expect(egfr.querySelectorAll('circle')).toHaveLength(4)
  expect(egfr.querySelector('rect')).toHaveAttribute('fill', 'rgba(31,179,156,.14)')
  expect(egfr).toHaveTextContent('Below 60 · kidney check')
  const hba1c = labs[1]
  expect(hba1c.querySelector('b')).toHaveStyle({ color: 'inherit' })
  expect(hba1c.querySelector('path')).toHaveAttribute('stroke', '#0b7f71')
  // eGFR axis 55..70, last value 58: y = 36 - (3/15)*32 = 29.6
  expect(egfr.querySelectorAll('circle')[3]).toHaveAttribute('cy', '29.6')
})

test('hospital readiness ranks three hospitals and the packet button opens the drawer', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  const rows = document.getElementById('hosps')!.querySelectorAll('tr')
  expect(rows).toHaveLength(3)
  expect(within(rows[0] as HTMLElement).getByText('Recommended')).toBeInTheDocument()
  expect(within(rows[2] as HTMLElement).getByText('31/28')).toHaveClass('pill', 'bad')
  fireEvent.click(screen.getByRole('button', { name: 'Preview the pre-arrival packet' }))
  const drawer = document.getElementById('drawer')!
  await waitFor(() => expect(within(drawer).getByText(/Female, 78/)).toBeInTheDocument())
  expect(within(drawer).getByRole('heading', { name: 'Pre-arrival packet' })).toBeInTheDocument()
  expect(within(drawer).getByText(/Sent as a FHIR bundle to the receiving ED only during an emergency/)).toBeInTheDocument()
})

test('data sources lists seven rows and a row opens its drawer', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  const rows = document.getElementById('srcs')!.querySelectorAll('tr')
  expect(rows).toHaveLength(7)
  expect(screen.getByText('Planned')).toHaveClass('pill', 'plain')
  fireEvent.click(screen.getByText('Pathology lab'))
  const drawer = document.getElementById('drawer')!
  expect(within(drawer).getByRole('heading', { name: 'Pathology lab' })).toBeInTheDocument()
  expect(within(drawer).getByText('HL7 v2 → FHIR R4')).toBeInTheDocument()
  expect(within(drawer).getByText('Last sync')).toBeInTheDocument()
})

test('follow-up plan lists five days', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  const days = document.querySelectorAll('.days > div')
  expect(days).toHaveLength(5)
  expect(days[4]).toHaveTextContent('DAY 30Readmission risk re-scored')
  expect(screen.getByText('Warning signs go to the discharge nurse as well as the family.')).toBeInTheDocument()
})

describe('consent', () => {
  const DATA = [
    'FHIR R4', '46 encounters from 6 sources', 'Amlodipine 5 mg', 'No interactions', 'eGFR', 'Camperdown Stroke Centre',
    'Wrist wearable', 'DAY 30', '1,284', 'penicillin',
  ]
  const absent = () => {
    for (const t of DATA) expect(screen.queryByText(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeNull()
    expect(document.getElementById('enc')).toBeNull()
    expect(document.getElementById('labs')).toBeNull()
    expect(document.querySelector('.kpis')).toBeNull()
  }

  test('a viewer without records (sarah) gets seven locked placeholders and no data in the DOM', async () => {
    renderWithProviders(<RecordPage />, { who: 'family', viewer: 'sarah' })
    await waitFor(() => expect(document.querySelectorAll('.locked-slot')).toHaveLength(7))
    await waitFor(() => expect(document.querySelector('.locked-slot')!.textContent).not.toMatch(/Checking/))
    absent()
    expect(document.querySelectorAll('[data-scat="records"]')).toHaveLength(7)
  })

  test('a viewer with records (james) sees everything', async () => {
    renderWithProviders(<RecordPage />, { who: 'family', viewer: 'james' })
    await ready()
    expect(screen.getByText('FHIR R4', { selector: '.tag' })).toBeInTheDocument()
    expect(document.querySelector('.locked-slot')).toBeNull()
  })

  test('pausing sharing locks the record for everyone, including james', async () => {
    const r = renderWithProviders(<RecordPage />, { who: 'family', viewer: 'james' })
    await ready()
    act(() => { r.app().togglePause() })
    await waitFor(() => expect(document.querySelectorAll('.locked-slot')).toHaveLength(7))
    absent()
  })
})

test('encounter types show by name: English ids, Vietnamese labels', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  const legend = () => Array.from(document.querySelectorAll('#enc ~ .legend span')).map((s) => s.textContent)
  expect(legend()).toEqual(['GP', 'Specialist', 'Pathology', 'Emergency', 'Hearing'])
  await act(() => i18n.changeLanguage('vi'))
  try {
    await screen.findByText('Lượt khám, 2023–2026')
    expect(legend()).toEqual(['Bác sĩ gia đình', 'Chuyên khoa', 'Xét nghiệm', 'Cấp cứu', 'Thính lực'])
  } finally {
    await act(() => i18n.changeLanguage('en'))
  }
})
