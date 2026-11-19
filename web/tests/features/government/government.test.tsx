import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import i18n from '@/i18n'
import { getGovernment, getSignals } from '@/data/repo'
import { PopulationPage } from '@/features/government/population/PopulationPage'
import { FunnelCard } from '@/features/government/population/FunnelCard'
import { ProgrammesCard } from '@/features/government/population/ProgrammesCard'
import { ReferralsCard } from '@/features/government/population/ReferralsCard'
import { ShareCard } from '@/features/government/population/ShareCard'
import { StalledCard } from '@/features/government/population/StalledCard'
import { GovernmentKpis } from '@/features/government/shared'
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
      'Prevention and screening', 'Who Noa reaches, and how safely',
      'Health and recovery', 'Health and wellbeing', 'Recovery after care', 'Screening capacity and performance',
      'Screening this quarter', 'Capacity and effectiveness by facility', 'Where capacity is out of balance',
      'Performance by hospital and centre', 'Programmes and outcomes', 'Programme signals',
    ])
    expect(Array.from(document.querySelector('main')!.children).map((c) => c.className.match(/\bc\d+\b/)?.[0])).toEqual(
      ['c12', 'c12', 'c12', 'c12', 'c8', 'c4', 'c12', 'c8', 'c4', 'c7', 'c5', 'c12', 'c6', 'c6', 'c12'],
    )
    // Hidden by the redesign (components kept): the KPI strip and five cards.
    expect(document.querySelector('#comKpis')).toBeNull()
    for (const gone of ['#stalled', '#funnel', '#capacity', '#langs', '#contact']) expect(document.querySelector(gone), gone).toBeNull()
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

  test('the six KPI tiles carry the design figures (strip no longer on the page)', async () => {
    const g = await getGovernment()
    renderWithProviders(<GovernmentKpis id="comKpis" kpis={g.kpis} />, opts)
    const tiles = Array.from(document.querySelectorAll('#comKpis .kpi')).map((k) => k.querySelector('.k')!.textContent)
    expect(tiles).toEqual(['Actionable results', 'Told within 1 day', 'Reached care in time', 'Days to treatment', 'Open past target', 'Controlled at 3 months'])
    expect(document.querySelectorAll('#comKpis .kpi')[4]).toHaveTextContent('636')
  })

  test('choosing a measure updates title, subtitle and aria-pressed', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    // The map opens on Coverage (as in the prototype).
    expect(document.querySelector('.loc b')).toHaveTextContent('Screening coverage')
    expect(screen.getByRole('button', { name: 'Coverage' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Open past target' }))
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
    // A small group (open under 10) shows no score: only the rows that have one are in the order.
    const scores = rows().flatMap((r) => { const b = r.querySelectorAll('td')[2].querySelector('b'); return b ? [Number(b.textContent)] : [] })
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

  test('results open past target (card kept, not on the page): 7 rows, longest first; Assign toasts and goes once; the row opens the drawer', async () => {
    const g = await getGovernment()
    renderWithProviders(<StalledCard rows={g.stalled} />, opts)
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

  test('funnel has 8 stages and 3 medians; referral, language and contact bars are drawn from the data (cards kept, not on the page)', async () => {
    const g = await getGovernment()
    renderWithProviders(
      <main>
        <FunnelCard stages={g.funnel} minis={g.funnelMinis} />
        <ReferralsCard rows={g.referrals} />
        <ShareCard id="langs" title="langs" meta="" rows={g.byLanguage.rows} note={g.byLanguage.note} />
        <ShareCard id="contact" title="contact" meta="" rows={g.byContact.rows} note={g.byContact.note} />
        <ProgrammesCard rows={g.programmes} />
      </main>,
      opts,
    )
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
    const g = await getGovernment()
    renderWithProviders(<GovernmentKpis id="comKpis" kpis={g.kpis} />, opts)
    const tile = Array.from(document.querySelectorAll('#comKpis .kpi')).find((k) => k.textContent?.includes('Open past target'))!
    fireEvent.click(tile)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Aggregated across adults screened in the 17 Abu Dhabi areas. Groups under 10 are suppressed.')).toBeInTheDocument()
    expect(within(dialog).getByText('Add to watchlist')).toBeInTheDocument()
  })
})

describe('prevention and screening', () => {
  test('8 KPI tiles with their notes; the warn notes are marked', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    const tiles = Array.from(document.querySelectorAll('#g04k > div'))
    expect(tiles.map((k) => k.querySelector('small')!.textContent)).toEqual([
      'Eligible reached', 'Recommended a check', 'Uptake after recommendation', 'Screenings completed',
      'False positives', 'Missed within 12 months', 'Model calibration', 'Recalled on time',
    ])
    expect(tiles.map((k) => k.querySelector('b')!.textContent)).toEqual(['51%', '14,610', '69%', '10,035', '8.4%', '1.1%', '0.93 O/E', '86%'])
    expect(tiles[0]).toHaveTextContent('24,600 of 48,200')
    expect(tiles[2]).toHaveTextContent('target 75%')
    expect(tiles[3]).toHaveTextContent('96% of those attended')
    expect(tiles.filter((k) => k.querySelector('span')!.className !== '')).toEqual([tiles[2], tiles[6]])
  })

  test('segment table: computed rates, thin data says so, groups under 10 hidden', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    const rows = Array.from(document.querySelectorAll('#g04seg tr'))
    expect(rows).toHaveLength(10)
    const cells = (i: number) => Array.from(rows[i].querySelectorAll('td')).map((td) => td.textContent)
    expect(cells(0)).toEqual(['Emirati men 30–39', '3,120', '45%', '612', '47%', '7%', '0.9%'])
    expect(cells(3)).toEqual(['Emirati women 40–59', '5,410', '52%', '1,560', '65%', '7%', '1.0%'])
    expect(cells(5)).toEqual(['Expat men 40–59', '12,100', '35%', '1,110', '36%', '12%', 'not enough follow-up'])
    expect(rows[5].querySelector('b')!.className).toMatch(/lo/)
    expect(rows[4].querySelector('b')!.className).toBe('')
    expect(cells(7)).toEqual(['Children 0–6 (well-child)', '7,778', '89%', '6,900', '84%', '—', 'not enough follow-up'])
    expect(cells(8)).toEqual(['Arabic-only speakers 60+', '44', '68%', '12', 'not enough data', '—', 'not enough follow-up'])
    expect(cells(9)).toEqual(['Men 70+, Al Dhafra', 'Hidden: fewer than 10 people (small-cell rule)'])
    expect(rows[9].querySelector('td[colspan="6"]')).not.toBeNull()
  })

  test('calibration chart, outcome funnel, recommended mix and safeguards', async () => {
    renderWithProviders(<PopulationPage />, opts)
    await readyPopulation()
    const card = document.querySelector('#g04') as HTMLElement
    const svg = within(card).getByRole('img', { name: 'Calibration: predicted versus observed 10-year heart risk by risk band, demo data' })
    expect(svg.querySelectorAll('circle')).toHaveLength(8)
    expect(svg).toHaveTextContent('top band over-predicts')
    const stages = Array.from(within(card).getByText('Outcomes: from eligible to recalled on time (last 12 months)').nextElementSibling!.children)
    expect(stages).toHaveLength(8)
    expect((stages[0].querySelector('i') as HTMLElement).style.width).toBe('100%')
    expect((stages[7].querySelector('i') as HTMLElement).style.width).toBe('14%')
    expect(stages[1]).toHaveTextContent('Reached by Noa24,60051% of previous')
    expect(stages[0].querySelector('em')!.textContent).toBe('')
    const mix = Array.from(within(card).getByText('What Noa recommended').nextElementSibling!.children)
    expect(mix).toHaveLength(9)
    expect((mix[7].querySelector('i') as HTMLElement).style.width).toBe('100%')
    expect((mix[2].querySelector('i') as HTMLElement).style.width).toBe('6%')
    const safe = card.querySelectorAll('ul.list li')
    expect(safe).toHaveLength(4)
    expect(safe[0]).toHaveTextContent('2,140 items routed to doctors')
    expect(safe[1]).toHaveTextContent('Uptake 36% vs 65% for Emirati women 40–59')
    expect(within(safe[1] as HTMLElement).getByText('Act')).toHaveClass('pill', 'warn')
    expect(safe[3]).toHaveTextContent('18,900 sessions; 0.3% stopped as Red')
  })

  test('Arabic: the section is translated and its figures formatted', async () => {
    await act(async () => { await i18n.changeLanguage('ar') })
    try {
      renderWithProviders(<PopulationPage />, opts)
      expect(await screen.findByText('الوقاية والفحص')).toBeInTheDocument()
      const first = Array.from(document.querySelectorAll('#g04seg tr')[0].querySelectorAll('td')).map((td) => td.textContent)
      expect(first[1]).toBe('3,120')
      expect(first[2]).toMatch(/^45\D*%/)
      expect(screen.getByText('مخفي: أقل من 10 أشخاص (قاعدة الخلايا الصغيرة)')).toBeInTheDocument()
    } finally {
      await act(async () => { await i18n.changeLanguage('en') })
    }
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
    // 24 bars, minus the 2 stacks whose cells under 10 merge into one hatched block each (2 fewer), plus the hatch pattern's own rect.
    expect(svg.querySelectorAll('rect')).toHaveLength(23)
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
