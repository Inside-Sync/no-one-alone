import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import i18n from '@/i18n'
import { getGovernment, getSignals } from '@/data/repo'
import { PopulationPage } from '@/features/government/population/PopulationPage'
import { SignalsPage } from '@/features/government/signals/SignalsPage'
import { PAGE_REGISTRY } from '@/features/registry'
import { mockCanvas, mockLayout, mockRaf } from '../../canvas/fakeCtx'
import { renderWithProviders } from '../../helpers/renderWithProviders'

const push = vi.fn()
vi.mock('@/app/navigation', () => ({ usePathname: () => '/government/population/', useRouter: () => ({ push, replace: vi.fn() }) }))

beforeEach(() => {
  push.mockClear()
  mockCanvas()
  mockLayout()
  mockRaf()
})

const opts = { who: 'family' as const }
const readyPopulation = () => screen.findByText('Performance by hospital and centre')

test('pages are registered for government/population and government/signals', () => {
  expect(PAGE_REGISTRY['government/population']).toBe(PopulationPage)
  expect(PAGE_REGISTRY['government/signals']).toBe(SignalsPage)
})

describe('population health', () => {
  test('shows every section in design order and span, nothing locked', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual([
      'Health and recovery', 'Health and wellbeing', 'Recovery after care', 'Screening to care',
      'Screening this quarter', 'Capacity and effectiveness by facility', 'Where capacity is out of balance',
      'Performance by hospital and centre', 'Results open past target', 'Screening to care',
      'Referral capacity vs need', 'In care in time, by language', 'In care in time, by contact',
      'Programmes and outcomes', 'Programme signals',
    ])
    expect(Array.from(document.querySelector('main')!.children).map((c) => c.className.match(/c\d+/)?.[0])).toEqual(
      ['c12', 'c8', 'c4', 'c12', 'c12', 'c8', 'c4', 'c7', 'c5', 'c12', 'c8', 'c4', 'c4', 'c4', 'c4', 'c6', 'c6', 'c12'],
    )
    expect(document.querySelectorAll('#comKpis .kpi')).toHaveLength(6)
    expect(screen.queryByText('Locked')).not.toBeInTheDocument()
  })

  test('health and wellbeing has 8 tiles; recovery has two headlines and 5 bars with a target line', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    const wb = document.querySelector('#wellbeing')!
    expect(within(wb as HTMLElement).getByText('Healthy life expectancy')).toBeInTheDocument()
    expect(within(wb as HTMLElement).getByText('66.8')).toBeInTheDocument()
    expect(wb.querySelectorAll('[class*="wbs"] svg')).toHaveLength(8)
    const rc = document.querySelector('#recoveryCard')!
    expect(rc).toHaveTextContent('72%')
    expect(rc).toHaveTextContent('recovered at 90 days')
    expect(rc.querySelectorAll('li')).toHaveLength(5)
    expect(rc.querySelectorAll('u')).toHaveLength(5)
    expect(within(rc as HTMLElement).getByRole('img', { name: 'Stroke 64% · target 70%' })).toBeInTheDocument()
  })

  test('the six KPI tiles carry the design figures', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    const tiles = Array.from(document.querySelectorAll('#comKpis .kpi')).map((k) => k.querySelector('.k')!.textContent)
    expect(tiles).toEqual(['Actionable results', 'Told within 1 day', 'Reached care in time', 'Days to treatment', 'Open past target', 'Controlled at 3 months'])
    expect(document.querySelectorAll('#comKpis .kpi')[4]).toHaveTextContent('636')
  })

  test('choosing a measure updates title, subtitle and aria-pressed', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    expect(document.querySelector('.loc b')).toHaveTextContent('Results open past target')
    expect(screen.getByRole('button', { name: 'Open past target' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Days to treatment' }))
    expect(document.querySelector('.loc b')).toHaveTextContent('Days from result to treatment')
    expect(document.querySelector('.loc small')).toHaveTextContent('Median days · taller is slower')
    expect(screen.getByRole('button', { name: 'Days to treatment' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Open past target' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Coverage' }))
    expect(document.querySelector('.loc b')).toHaveTextContent('Screening coverage')
  })

  test('the map shows 17 areas, works without waiting for the city geometry, and has no Sydney credit', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    expect(screen.getByRole('group', { name: 'Area measure' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3D column map of 17 Abu Dhabi areas' })).toBeInTheDocument()
    expect(document.querySelector('.map-attr')).toBeNull()
    expect(screen.queryByText(/ABS/)).not.toBeInTheDocument()
  })

  test('screening this quarter: seven weeks against the 210 slots, three stats, three campaigns, one approve', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    const bars = document.querySelectorAll('#screeningWeeks .vbars > div')
    expect(bars).toHaveLength(7)
    expect(bars[6]).toHaveTextContent('238')
    expect(screen.getByText('slots 210')).toBeInTheDocument()
    expect(screen.getByText('Above capacity')).toHaveClass('pill', 'warn')
    expect(screen.getByText('Running')).toHaveClass('pill', 'good')
    expect(screen.getByText('To approve')).toHaveClass('pill', 'warn')
    fireEvent.click(screen.getByRole('button', { name: 'Approve mobile clinic days' }))
    expect(screen.getByText('Approved · 4 mobile clinic days added for November')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✓ Approved' })).toBeDisabled()
  })

  test('capacity scatter has 8 facilities and the average line; the balance card counts 3, 4 and 1', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    const svg = screen.getByRole('img', { name: 'Capacity used against effectiveness for 8 facilities' })
    expect(svg.querySelectorAll('circle')).toHaveLength(8)
    expect(svg.textContent).toContain('Abu Dhabi average 75')
    expect(svg.textContent).toContain('Mussafah FHC')
    const nums = Array.from(document.querySelectorAll('#capSum b')).map((b) => b.textContent)
    expect(nums.slice(0, 3)).toEqual(['3', '4', '1'])
    expect(screen.getByText('Mussafah Family Health Centre', { selector: '#capSum b' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Send Mussafah overflow to Al Bateen' }))
    expect(screen.getByText('Approved · evening overflow from Mussafah offered at Al Bateen for 8 weeks')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✓ Sent' })).toBeDisabled()
  })

  test('facility table: 8 rows, lowest effectiveness first, filter All / Hospitals / Family health centres', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    const rows = () => Array.from(document.querySelectorAll('#hfRows tr'))
    expect(rows()).toHaveLength(8)
    expect(rows()[0]).toHaveTextContent('Mussafah Family Health Centre')
    expect(rows()[0]).toHaveTextContent('104%')
    expect(rows()[0]).toHaveTextContent('Over capacity')
    expect(rows()[0]).toHaveTextContent('Below 70%')
    expect(rows()[7]).toHaveTextContent('On target')
    const scores = rows().map((r) => Number(r.querySelectorAll('td')[2].querySelector('b')!.textContent))
    expect(scores).toEqual([...scores].sort((a, b) => a - b))
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Hospitals' }))
    expect(rows()).toHaveLength(3)
    expect(rows().every((r) => r.textContent?.includes('Hospital'))).toBe(true)
    expect(screen.getByRole('button', { name: 'Hospitals' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Family health centres' }))
    expect(rows()).toHaveLength(5)
    expect(rows().some((r) => r.textContent?.includes('Hospital ·'))).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(rows()).toHaveLength(8)
  })

  test('results open past target: 7 rows, longest first; Assign toasts and goes once; the row opens the drawer', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    const rows = Array.from(document.querySelectorAll('#stalled tr'))
    expect(rows).toHaveLength(7)
    expect(rows[0]).toHaveTextContent('Mohammed I.')
    expect(rows[0]).toHaveTextContent('41 d')
    expect(within(rows[0] as HTMLElement).getByText('41 d')).toHaveClass('pill', 'bad')
    expect(within(rows[6] as HTMLElement).getByText('9 d')).toHaveClass('pill', 'plain')
    const days = rows.map((r) => Number(r.querySelectorAll('td')[3].textContent!.replace(/\D/g, '')))
    expect(days).toEqual([...days].sort((a, b) => b - a))
    const row = rows[2] as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Assign' }))
    expect(screen.getByText('Assigned · Ahmed R. is on the regional coordinator list')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: '✓ Assigned' })).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(rows[1] as HTMLElement).getByRole('button', { name: 'Assign' })).toBeEnabled()
    fireEvent.click(within(row).getByText('Baniyas'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Assign a coordinator')).toBeInTheDocument()
    expect(within(dialog).getByText('Re-refer nearer home')).toBeInTheDocument()
  })

  test('funnel has 8 stages and 3 medians; referral, language and contact bars are drawn from the data', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    const funnel = Array.from(document.querySelectorAll('#funnel > div'))
    expect(funnel).toHaveLength(8)
    expect((funnel[0].querySelector('i') as HTMLElement).style.width).toBe('100%')
    expect(funnel[0]).toHaveTextContent('2,738')
    expect((funnel[2].querySelector('i') as HTMLElement).style.width).toBe(`${(2492 / 2738) * 100}%`)
    expect(screen.getByText('0.6 d')).toBeInTheDocument()
    const cap = Array.from(document.querySelectorAll('#capacity > div'))
    expect(cap).toHaveLength(9)
    expect(cap[0].querySelector('span')!.textContent).toBe('Diabetes education')
    expect(cap[0].querySelector('b')!.textContent).toBe('−4')
    expect(cap[5].querySelector('b')!.textContent).toBe('+9')
    expect(document.querySelectorAll('#langs > div')).toHaveLength(7)
    expect(document.querySelectorAll('#contact > div')).toHaveLength(4)
    expect(document.querySelector('#langs > div:last-child')).toHaveTextContent('Bengali61%')
    expect(document.querySelectorAll('#progs tr')).toHaveLength(6)
  })

  test('opening programme signals navigates', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    fireEvent.click(screen.getByRole('button', { name: 'Open programme signals' }))
    expect(push).toHaveBeenCalledWith('/government/signals')
  })

  test('a failed load shows the page error card without crashing', async () => {
    const repo = await import('@/data/repo')
    const spy = vi.spyOn(repo, 'getGovernment').mockRejectedValueOnce(new Error('offline'))
    renderWithProviders(<PopulationPage />, opts)
    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('common:pageError.text'))
    expect(document.querySelector('#comKpis')).toBeNull()
    spy.mockRestore()
  })

  test('kpi tile opens a drawer with the government explanation and actions', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    const tile = Array.from(document.querySelectorAll('#comKpis .kpi')).find((k) => k.textContent?.includes('Open past target'))!
    fireEvent.click(tile)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Aggregated across adults screened in the 17 Abu Dhabi areas. Groups under 10 are suppressed.')).toBeInTheDocument()
    expect(within(dialog).getByText('Add to watchlist')).toBeInTheDocument()
  })
})

describe('programme signals', () => {
  const ready = () => screen.findByText('Feed for programme staff')

  test('shows every section in design order and span', async () => {
    renderWithProviders(<SignalsPage />, opts)
    await ready()
    expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual([
      'Signals across Abu Dhabi', 'Results passing their target each week', 'Feed for programme staff', 'Decisions waiting for you',
    ])
    expect(Array.from(document.querySelector('main')!.children).map((c) => c.className.match(/c\d+/)?.[0])).toEqual(['c12', 'c7', 'c5', 'c6', 'c6', 'c12'])
    expect(document.querySelectorAll('.kpis .kpi')).toHaveLength(4)
    expect(document.querySelectorAll('#watchRows tr')).toHaveLength(7)
    expect(screen.queryByText('Locked')).not.toBeInTheDocument()
  })

  test('signals table carries status pills in their tones', async () => {
    renderWithProviders(<SignalsPage />, opts)
    await ready()
    const rows = Array.from(document.querySelectorAll('#watchRows tr'))
    expect(rows[0]).toHaveTextContent('Night-shift workers not reached by SMS')
    expect(within(rows[0] as HTMLElement).getByText('Active')).toHaveClass('pill', 'bad')
    expect(within(rows[2] as HTMLElement).getByText('Watching')).toHaveClass('pill', 'warn')
    expect(within(rows[6] as HTMLElement).getByText('Running')).toHaveClass('pill', 'good')
  })

  test('weekly chart has eight stacked weeks, the first and latest labelled with their total, and the legend', async () => {
    renderWithProviders(<SignalsPage />, opts)
    await ready()
    const svg = screen.getByRole('img', { name: /Results open past target each week over 8 weeks, falling from 68 to 59/ })
    expect(svg.querySelectorAll('rect')).toHaveLength(24)
    const texts = Array.from(svg.querySelectorAll('text')).map((t) => t.textContent)
    expect(texts).toContain('this wk')
    expect(texts).toContain('w-7')
    expect(texts).toContain('68')
    expect(texts).toContain('59')
    expect(screen.getByText('Waiting for a slot')).toBeInTheDocument()
  })

  test('feed shows sources and opens a drawer with actions', async () => {
    renderWithProviders(<SignalsPage />, opts)
    await ready()
    const items = Array.from(document.querySelectorAll('#newsCom > li'))
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('LAB FEED · Abu Dhabi labs')
    expect(items[0]).toHaveTextContent('Today')
    fireEvent.click(items[0])
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Share with the programme team')).toBeInTheDocument()
    expect(within(dialog).getByText('Dismiss')).toBeInTheDocument()
  })

  test('decisions: five rows; Approve toasts and locks that row only', async () => {
    renderWithProviders(<SignalsPage />, opts)
    await ready()
    const li = document.querySelectorAll('#decisions > li')
    expect(li).toHaveLength(5)
    fireEvent.click(within(li[0] as HTMLElement).getByRole('button', { name: 'Approve' }))
    expect(screen.getByText('Approved and logged · the programme team is notified')).toBeInTheDocument()
    expect(within(li[0] as HTMLElement).getByRole('button', { name: '✓ Approved' })).toBeDisabled()
    expect(within(li[1] as HTMLElement).getByRole('button', { name: 'Approve' })).toBeEnabled()
  })

  test('a failed load shows the page error card', async () => {
    const repo = await import('@/data/repo')
    const spy = vi.spyOn(repo, 'getSignals').mockRejectedValueOnce(new Error('offline'))
    renderWithProviders(<SignalsPage />, opts)
    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('common:pageError.text'))
    expect(document.querySelector('#watchKpis')).toBeNull()
    spy.mockRestore()
  })
})

test('fixtures are reachable through the repo', async () => {
  const g = await getGovernment()
  expect(g.areas).toHaveLength(17)
  expect(g.facilities.rows).toHaveLength(8)
  expect((await getSignals()).signals).toHaveLength(7)
  await act(async () => {})
})
