import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { LineagePage } from '@/features/individual/lineage/LineagePage'
import { PAGE_REGISTRY } from '@/features/registry'
import { renderWithProviders } from '../../helpers/renderWithProviders'
import { fillForWhiteText } from '@/lib/color'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/lineage/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const ready = () => screen.findByText('Four generations')
const toastText = () => document.getElementById('toast')!.textContent

test('is registered for individual/lineage', () => {
  expect(PAGE_REGISTRY['individual/lineage']).toBe(LineagePage)
})

test('shows every section heading in prototype order', async () => {
  renderWithProviders(<LineagePage />, { who: 'self' })
  await ready()
  expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual([
    'Four generations', 'Family pattern strength for you, James', 'Your screening plan', 'Condition matrix', 'Sharing and consent',
  ])
  expect(screen.getByText('From Family Connect · 11 people · 9 consented')).toBeInTheDocument()
  const cards = Array.from(document.querySelectorAll('main > article, main > div > article'))
  expect(cards.map((c) => c.className.match(/c\d+/)?.[0] ?? '-')).toEqual(['c7', '-', '-', 'c7', 'c5'])
})

test('pedigree lists four generations of nodes with condition chips', async () => {
  renderWithProviders(<LineagePage />, { who: 'self' })
  await ready()
  const ped = document.getElementById('ped')!
  expect(Array.from(ped.querySelectorAll('.gen-l')).map((e) => e.textContent)).toEqual(['Grandparents', "Margaret's generation", 'Children', 'Grandchildren'])
  expect(ped.querySelectorAll('.lk')).toHaveLength(3)
  expect(ped.querySelectorAll('.node')).toHaveLength(9)
  const james = screen.getByText('James Collins').closest('.node')!
  expect(james).toHaveClass('you')
  expect(within(james as HTMLElement).getByText('HTN 138/86')).toHaveStyle({ background: fillForWhiteText('#c88a05') })
  expect(screen.getByText('Margaret Collins').closest('.node')).toHaveClass('focus')
  expect(screen.getByText('Arthur Hughes').closest('.node')).toHaveClass('dec')
  expect(within(document.getElementById('cxLegend')!).getByText('Number = age at onset')).toBeInTheDocument()
  expect(document.getElementById('cxLegend')!.querySelectorAll('i')).toHaveLength(7)
})

test('strength rows fill the right number of dots', async () => {
  renderWithProviders(<LineagePage />, { who: 'self' })
  await ready()
  const rows = document.getElementById('strength')!.children
  expect(rows).toHaveLength(7)
  expect(rows[0].querySelectorAll('i.on')).toHaveLength(4)
  expect(rows[0].querySelectorAll('i')).toHaveLength(4)
  expect(rows[0]).toHaveTextContent('HypertensionStrong')
  expect(rows[1].querySelectorAll('i.on')).toHaveLength(3)
  expect(rows[6].querySelectorAll('i.on')).toHaveLength(1)
  expect(screen.getByText(/It guides screening, it does not predict genes\./)).toBeInTheDocument()
})

test('screening plan: six checks, Book buttons are one-shot and also open the row drawer', async () => {
  renderWithProviders(<LineagePage />, { who: 'self' })
  await ready()
  const body = document.getElementById('screen')!
  expect(body.querySelectorAll('tr')).toHaveLength(6)
  expect(screen.getByText('Overdue')).toHaveClass('pill', 'bad')
  expect(screen.getByText('Done Aug 2025')).toHaveClass('pill', 'good')
  expect(body.querySelectorAll('button')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Book GP' }))
  expect(toastText()).toBe('Booking request sent to your GP in Melbourne')
  const done = screen.getByRole('button', { name: '✓ Requested' })
  expect(done).toBeDisabled()
  const drawer = document.getElementById('drawer')!
  expect(within(drawer).getByRole('heading', { name: 'Blood pressure check' })).toBeInTheDocument()
  expect(within(drawer).getByText('12 months')).toBeInTheDocument()
})

test('condition matrix colours affected cells and leaves the rest blank', async () => {
  renderWithProviders(<LineagePage />, { who: 'self' })
  await ready()
  const mx = document.getElementById('mx')!
  expect(Array.from(mx.querySelectorAll('thead th')).map((t) => t.textContent)).toEqual([
    'Person', 'Hypertension', 'Stroke', 'Atrial fibrillation', 'Type 2 diabetes', 'Glaucoma', 'Dementia', 'Hearing loss',
  ])
  const rows = mx.querySelectorAll('tbody tr')
  expect(rows).toHaveLength(7)
  const arthur = rows[0].querySelectorAll('td')
  expect(arthur[1]).toHaveTextContent('55')
  expect(arthur[1]).toHaveStyle({ background: fillForWhiteText('#c88a05'), color: '#fff' })
  expect(arthur[3]).toHaveTextContent('')
  expect(arthur[3]).toHaveStyle({ background: 'var(--track)' })
  expect(rows[6].querySelectorAll('td')[1]).toHaveTextContent('↑')
  // Matrix rows are not clickable (the prototype skips `.mx`).
  fireEvent.click(rows[0])
  expect(document.getElementById('drawer')).toHaveAttribute('aria-hidden', 'true')
})

test('consent switches are local toggles: no toast, no audit entry, no share change', async () => {
  const r = renderWithProviders(<LineagePage />, { who: 'self' })
  await ready()
  const cm = document.getElementById('cm')!
  expect(within(cm).getAllByRole('switch')).toHaveLength(25)
  const sw = within(cm).getByRole('switch', { name: 'David shares Medicines' })
  expect(sw).toHaveAttribute('aria-checked', 'false')
  expect(within(cm).getByRole('switch', { name: 'Margaret shares Location' })).toHaveAttribute('aria-checked', 'true')
  expect(within(cm).getByRole('switch', { name: 'Margaret shares Genetic' })).toHaveAttribute('aria-checked', 'false')
  const before = toastText()
  fireEvent.click(sw)
  expect(sw).toHaveAttribute('aria-checked', 'true')
  expect(toastText()).toBe(before)
  expect(r.app().audit).toHaveLength(0)
  fireEvent.click(sw)
  expect(sw).toHaveAttribute('aria-checked', 'false')
})

test('lineage is not tagged with a consent category: family viewers and paused sharing still see it', async () => {
  const r = renderWithProviders(<LineagePage />, { who: 'family', viewer: 'sarah' })
  await ready()
  act(() => { r.app().togglePause() })
  await waitFor(() => expect(r.app().paused).toBe(true))
  expect(screen.getByText('Condition matrix')).toBeInTheDocument()
  expect(document.querySelector('.locked-slot')).toBeNull()
})
