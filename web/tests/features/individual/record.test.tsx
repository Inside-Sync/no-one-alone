import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { RecordPage } from '@/features/individual/record/RecordPage'
import { PAGE_REGISTRY } from '@/features/registry'
import i18n from '@/i18n'
import { renderWithProviders } from '../../helpers/renderWithProviders'

const push = vi.fn()
const replace = vi.fn()
vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/record/', useRouter: () => ({ push, replace }) }))

const ready = () => screen.findByText('What happened, step by step')
const drawerEl = () => document.getElementById('drawer')!
const step = (name: string) => fireEvent.click(within(screen.getByRole('list', { name: 'Care record steps' })).getByRole('button', { name: new RegExp(name) }))

beforeEach(() => { push.mockClear(); replace.mockClear() })

test('is registered for individual/record', () => {
  expect(PAGE_REGISTRY['individual/record']).toBe(RecordPage)
})

test('the stepper lists the six steps, starts on Summary and carries the walkthrough marker', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  const steps = within(screen.getByRole('list', { name: 'Care record steps' })).getAllByRole('button')
  expect(steps.map((b) => b.textContent)).toEqual(['1Summary', '2History', '3Screening', '4Results', '5Treatment', '6Follow-up'])
  expect(steps[0]).toHaveAttribute('aria-current', 'step')
  expect(document.querySelector('[data-tour="record-steps"]')).not.toBeNull()
  expect(screen.getByText('Discharged · outpatient follow-up')).toBeInTheDocument()
  expect(screen.getByText('Corniche Stroke Centre · Dr Sara Al Mazrouei')).toBeInTheDocument()
})

test('summary: home banner, journey, six tiles, medicines, encounters, each with source and time', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  expect(screen.getByText("You're home · day 11 after your stroke")).toBeInTheDocument()
  expect(document.querySelectorAll('ol > li h3')).toHaveLength(5)
  const tiles = document.querySelectorAll('.kpis .kpi')
  expect(tiles).toHaveLength(6)
  expect(tiles[0]).toHaveTextContent('1,284')
  expect(tiles[5]).toHaveTextContent('Al Bateen Family Health Centre')
  expect(screen.getByText('46 encounters from 6 sources')).toBeInTheDocument()
  const svg = screen.getByRole('img', { name: /46 encounters from 2023 to 2026/ })
  expect(svg.querySelectorAll('circle')).toHaveLength(46)
  expect(within(svg as unknown as HTMLElement).getByText('fall · wrist')).toBeInTheDocument()
  expect(document.getElementById('meds')!.querySelectorAll('tr')).toHaveLength(5)
  expect(screen.getByText('Pill box and discharge plan')).toBeInTheDocument()
  expect(screen.getAllByText('Corniche Stroke Centre discharge summary').length).toBeGreaterThan(0)
})

test('words: "you" in her own app, third person for family', async () => {
  const own = renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  expect(screen.getByText('My care record')).toBeInTheDocument()
  expect(screen.getByText(/Your treatment plan is step 5/)).toBeInTheDocument()
  own.unmount()
  renderWithProviders(<RecordPage />, { who: 'family' })
  await ready()
  expect(screen.getByText("Moza's care record")).toBeInTheDocument()
  expect(screen.getByText('Moza is home · day 11 after her stroke')).toBeInTheDocument()
  expect(screen.getByText(/Her treatment plan is step 5/)).toBeInTheDocument()
})

test('history: six episodes, who holds the records, family history; an episode opens its entry', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  step('History')
  expect(screen.getByText('Your past care')).toBeInTheDocument()
  expect(document.querySelectorAll('details')).toHaveLength(6)
  expect(screen.getByText('Who holds your records')).toBeInTheDocument()
  expect(screen.getByText('Malaffi is a planned link in this prototype.')).toBeInTheDocument()
  expect(screen.getByText("Your family's health")).toBeInTheDocument()
  expect(document.querySelectorAll('tbody tr')).toHaveLength(5)
  fireEvent.click(screen.getAllByRole('button', { name: 'Open the full entry' })[0])
  expect(within(drawerEl()).getByRole('heading', { name: 'Going home' })).toBeInTheDocument()
})

test('screening, results and follow-up show their cards with a source line', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  step('Screening')
  expect(screen.getByText('Your checks before the stroke')).toBeInTheDocument()
  expect(document.querySelectorAll('tbody tr')).toHaveLength(5)
  expect(screen.getByText('Noa case log')).toBeInTheDocument()
  step('Results')
  expect(screen.getByText('Hospital test results')).toBeInTheDocument()
  expect(document.querySelectorAll('tbody tr')).toHaveLength(8)
  expect(document.querySelectorAll('#labs .lab')).toHaveLength(4)
  step('Follow-up')
  expect(screen.getByText('Your readings since you came home')).toBeInTheDocument()
  expect(screen.getByText('Day 30 · 16 Nov')).toBeInTheDocument()
  expect(screen.getByText('Noa follow-up calls')).toBeInTheDocument()
})

test('Back and Next walk the steps; Treatment leads to its page', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: 'Next: History →' }))
  expect(screen.getByText('Your past care')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '← Back: Summary' }))
  await ready()
  fireEvent.click(screen.getByRole('button', { name: /Treatment plan/ }))
  expect(push).toHaveBeenCalledWith('/individual/treatment')
})

test('a table row opens its chart entry in the drawer, with related entries and source', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByText('Apixaban 5 mg'))
  const d = drawerEl()
  expect(within(d).getByRole('heading', { name: 'New medicines' })).toBeInTheDocument()
  expect(within(d).getByText('19 / 23')).toBeInTheDocument()
  expect(within(d).getByText('Atorvastatin 20 → 40 mg')).toBeInTheDocument()
  expect(within(d).getByText('Discharge plan')).toBeInTheDocument()
  fireEvent.click(within(d).getByRole('button', { name: /Uneven heartbeat found/ }))
  await waitFor(() => expect(within(drawerEl()).getByRole('heading', { name: 'Uneven heartbeat found' })).toBeInTheDocument())
})

test('Whole case, start to finish walks all 23 entries in time order and closes', async () => {
  renderWithProviders(<RecordPage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: 'Whole case, start to finish' }))
  const d = drawerEl()
  expect(within(d).getByText('1 / 23')).toBeInTheDocument()
  expect(within(d).getByRole('heading', { name: 'Whole case, start to finish' })).toBeInTheDocument()
  expect(within(d).getAllByText('2021').length).toBeGreaterThan(0)
  const seen = ['1 / 23']
  for (let i = 2; i <= 23; i++) {
    const next = Array.from(d.querySelectorAll('button.btn.sm')).find((b) => b.textContent?.endsWith('→'))!
    fireEvent.click(next)
    seen.push(`${i} / 23`)
    expect(within(d).getByText(`${i} / 23`)).toBeInTheDocument()
  }
  expect(within(d).getByText('Today')).toBeInTheDocument()
  expect(seen).toHaveLength(23)
  const closes = within(d).getAllByRole('button', { name: 'Close' })
  expect(closes).toHaveLength(1)
  fireEvent.click(closes[0])
})

describe('consent', () => {
  test('a viewer without records (sarah) gets locked placeholders and no data in the DOM', async () => {
    renderWithProviders(<RecordPage />, { who: 'family', viewer: 'sarah' })
    await waitFor(() => expect(document.querySelectorAll('.locked-slot').length).toBeGreaterThan(0))
    await waitFor(() => expect(document.querySelector('.locked-slot')!.textContent).not.toMatch(/Checking/))
    expect(screen.queryByText('46 encounters from 6 sources')).toBeNull()
    expect(document.getElementById('enc')).toBeNull()
    expect(document.querySelector('.kpis')).toBeNull()
  })

  test('a viewer with records (james) sees everything, and pausing locks it', async () => {
    const r = renderWithProviders(<RecordPage />, { who: 'family', viewer: 'james' })
    await ready()
    expect(document.querySelector('.locked-slot')).toBeNull()
    act(() => { r.app().togglePause() })
    await waitFor(() => expect(document.querySelectorAll('.locked-slot').length).toBeGreaterThan(0))
    expect(document.getElementById('enc')).toBeNull()
  })
})

test('Arabic: the page shows translated steps and keeps encounter ids', async () => {
  const t = i18n.getFixedT('ar', 'record') as (k: string) => string
  await act(() => i18n.changeLanguage('ar'))
  try {
    renderWithProviders(<RecordPage />, { who: 'self' })
    await screen.findByText(t('journey.title'))
    expect(screen.getByRole('list', { name: t('stepper.aria') })).toBeInTheDocument()
    expect(screen.getAllByText(t('stepper.steps.his')).length).toBeGreaterThan(0)
  } finally {
    await act(() => i18n.changeLanguage('en'))
  }
})
