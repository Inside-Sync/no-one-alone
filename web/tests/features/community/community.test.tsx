import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { getCommunity, getWatch } from '@/data/repo'
import { CommunityPage } from '@/features/community/overview/CommunityPage'
import { WatchPage } from '@/features/community/watch/WatchPage'
import { PAGE_REGISTRY } from '@/features/registry'
import { mockCanvas, mockLayout, mockRaf } from '../../canvas/fakeCtx'
import { renderWithProviders } from '../../helpers/renderWithProviders'

const push = vi.fn()
vi.mock('@/app/navigation', () => ({ usePathname: () => '/community/community/', useRouter: () => ({ push, replace: vi.fn() }) }))

beforeEach(() => {
  push.mockClear()
  mockCanvas()
  mockLayout()
  mockRaf()
})

const opts = { who: 'family' as const }
const readyOverview = () => screen.findByText('Heatwave plan')

test('pages are registered for community/community and community/watch', () => {
  expect(PAGE_REGISTRY['community/community']).toBe(CommunityPage)
  expect(PAGE_REGISTRY['community/watch']).toBe(WatchPage)
})

describe('community overview', () => {
  test('shows every section in prototype order and span, nothing locked', async () => {
    renderWithProviders(<CommunityPage />, opts)
    await readyOverview()
    expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual([
      'Heatwave plan', 'Who needs a visit this week', 'Alert funnel', 'Volunteer capacity vs need',
      'Emergency demand forecast', 'Languages', 'Programs and outcomes', 'Neighbourhood watch',
    ])
    expect(Array.from(document.querySelector('main')!.children).map((c) => c.className.match(/c\d+/)?.[0])).toEqual(
      ['c12', 'c8', 'c4', 'c8', 'c4', 'c4', 'c4', 'c4', 'c6', 'c6', 'c12'],
    )
    expect(document.querySelectorAll('.kpis .kpi')).toHaveLength(12)
    expect(screen.queryByText('Locked')).not.toBeInTheDocument()
    expect(screen.getByText('Thursday 38 °C')).toHaveClass('pill', 'bad')
  })

  test('choosing a model updates title, subtitle and aria-pressed', async () => {
    renderWithProviders(<CommunityPage />, opts)
    await readyOverview()
    expect(screen.getByText('High-risk residents')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'High risk' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Visit gap' }))
    expect(document.querySelector('.loc b')).toHaveTextContent('Visit gap')
    expect(document.querySelector('.loc small')).toHaveTextContent('Weekly visits needed minus volunteer capacity')
    expect(screen.getByRole('button', { name: 'Visit gap' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'High risk' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Heat' }))
    expect(document.querySelector('.loc b')).toHaveTextContent('Heat vulnerability')
  })

  test('model buttons work without waiting for the city geometry', async () => {
    renderWithProviders(<CommunityPage />, opts)
    await readyOverview()
    expect(screen.getByRole('group', { name: 'District metric' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3D column map of 15 Inner West suburbs' })).toBeInTheDocument()
  })

  test('visit list sorted by risk desc', async () => {
    renderWithProviders(<CommunityPage />, opts)
    await readyOverview()
    const rows = Array.from(document.querySelectorAll('#visits tr'))
    expect(rows).toHaveLength(8)
    const rank = { High: 3, Medium: 2, Watch: 1 } as const
    const risks = rows.map((r) => rank[r.querySelector('.pill')!.textContent as keyof typeof rank])
    expect(risks).toEqual([...risks].sort((a, b) => b - a))
    expect(rows[0]).toHaveTextContent('Margaret C.')
    expect(rows[0]).toHaveTextContent('English')
  })

  test('Plan visit toasts and goes once without opening the drawer; the row opens it', async () => {
    renderWithProviders(<CommunityPage />, opts)
    await readyOverview()
    const row = document.querySelectorAll('#visits tr')[2] as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Plan visit' }))
    expect(screen.getByText('Visit planned for Nguyen Van T.')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: '✓ Planned' })).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(within(row).getByText('Tempe'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Plan a visit')).toBeInTheDocument()
    expect(within(dialog).getByText('Call in their language')).toBeInTheDocument()
    expect(within(dialog).getByText('None · gap')).toBeInTheDocument()
  })

  test('heatwave plan: stats, cool rooms and the once-only schedule button', async () => {
    renderWithProviders(<CommunityPage />, opts)
    await readyOverview()
    expect(document.querySelectorAll('#temps .vbars b, .vbars b')[0]).toHaveTextContent('33°')
    expect(screen.getByText('heatwave 35°')).toBeInTheDocument()
    expect(screen.getByText('Marrickville Library cool room')).toBeInTheDocument()
    expect(screen.getByText('74 left')).toHaveClass('pill', 'good')
    expect(screen.getByText('22 left')).toHaveClass('pill', 'warn')
    expect(screen.getByText('priority')).toHaveStyle({ color: 'var(--bad)' })
    fireEvent.click(screen.getByRole('button', { name: 'Schedule all check-ins' }))
    expect(screen.getByText('318 extra check-ins scheduled for Thursday')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✓ 318 scheduled' })).toBeDisabled()
  })

  test('funnel, capacity and languages are drawn from the fixture', async () => {
    renderWithProviders(<CommunityPage />, opts)
    await readyOverview()
    const funnel = Array.from(document.querySelectorAll('#funnel > div'))
    expect(funnel).toHaveLength(7)
    expect((funnel[0].querySelector('i') as HTMLElement).style.width).toBe('100%')
    expect((funnel[5].querySelector('i') as HTMLElement).style.width).toBe('12%')
    expect((funnel[2].querySelector('i') as HTMLElement).style.width).toBe(`${(29 / 37) * 100}%`)
    const cap = Array.from(document.querySelectorAll('#capacity > div'))
    expect(cap).toHaveLength(9)
    const first = cap[0]
    expect(first.querySelector('span')!.textContent).toBe('Marrickville')
    expect(first.querySelector('b')!.textContent).toBe('−40')
    expect(document.querySelectorAll('#langs > div')).toHaveLength(8)
    expect(screen.getByText('42% · Full')).toBeInTheDocument()
    expect(screen.getByText('9% · Interpreter')).toBeInTheDocument()
    expect(document.querySelectorAll('#progs tr')).toHaveLength(6)
  })

  test('opening neighbourhood watch navigates', async () => {
    renderWithProviders(<CommunityPage />, opts)
    await readyOverview()
    fireEvent.click(screen.getByRole('button', { name: 'Open neighbourhood watch' }))
    expect(push).toHaveBeenCalledWith('/community/watch')
  })

  test('a failed load leaves the page empty without crashing', async () => {
    const repo = await import('@/data/repo')
    const spy = vi.spyOn(repo, 'getCommunity').mockRejectedValueOnce(new Error('offline'))
    renderWithProviders(<CommunityPage />, opts)
    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(document.querySelector('main')).toBeNull()
    spy.mockRestore()
  })

  test('kpi tile opens a drawer with the community explanation and actions', async () => {
    renderWithProviders(<CommunityPage />, opts)
    await readyOverview()
    const tile = Array.from(document.querySelectorAll('.kpis .kpi')).find((k) => k.textContent?.includes('Visits short this week'))!
    fireEvent.click(tile)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Aggregated across enrolled residents in the 15 Inner West suburbs. Groups under 10 are suppressed.')).toBeInTheDocument()
    expect(within(dialog).getByText('Add to watchlist')).toBeInTheDocument()
  })
})

describe('community watch', () => {
  const ready = () => screen.findByText('Feed for community staff')

  test('shows every section in prototype order and span', async () => {
    renderWithProviders(<WatchPage />, opts)
    await ready()
    expect(Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)).toEqual([
      'Neighbourhood watch across the Inner West', 'Scam contacts reported by residents', 'Feed for community staff', 'Volunteer call-outs',
    ])
    expect(Array.from(document.querySelector('main')!.children).map((c) => c.className.match(/c\d+/)?.[0])).toEqual(['c12', 'c7', 'c5', 'c6', 'c6'])
    expect(document.querySelectorAll('.kpis .kpi')).toHaveLength(6)
    expect(document.querySelectorAll('#watchRows tr')).toHaveLength(8)
    expect(screen.queryByText('Locked')).not.toBeInTheDocument()
  })

  test('scam chart has eight weeks, a labelled latest week and the legend', async () => {
    renderWithProviders(<WatchPage />, opts)
    await ready()
    const svg = screen.getByRole('img', { name: /Scam contacts reported per week over 8 weeks, rising to 37 this week/ })
    expect(svg.querySelectorAll('rect')).toHaveLength(24)
    const texts = Array.from(svg.querySelectorAll('text')).map((t) => t.textContent)
    expect(texts).toContain('this wk')
    expect(texts).toContain('w-7')
    expect(texts).toContain('37')
    expect(screen.getByText('Door-to-door')).toBeInTheDocument()
  })

  test('feed shows sources and opens a drawer with community actions', async () => {
    renderWithProviders(<WatchPage />, opts)
    await ready()
    const items = Array.from(document.querySelectorAll('#newsCom > li'))
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('SAFETY · Local police')
    expect(items[0]).toHaveTextContent('5 h ago')
    fireEvent.click(items[0])
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Send to residents')).toBeInTheDocument()
    expect(within(dialog).getByText('Dismiss')).toBeInTheDocument()
  })

  test('call-outs: Accept toasts and goes once', async () => {
    renderWithProviders(<WatchPage />, opts)
    await ready()
    const li = document.querySelectorAll('#callouts > li')
    expect(li).toHaveLength(6)
    fireEvent.click(within(li[0] as HTMLElement).getByRole('button', { name: 'Accept' }))
    expect(screen.getByText('Accepted · added to your roster')).toBeInTheDocument()
    expect(within(li[0] as HTMLElement).getByRole('button', { name: '✓ Accepted' })).toBeDisabled()
    expect(within(li[1] as HTMLElement).getByRole('button', { name: 'Accept' })).toBeEnabled()
  })

  test('a failed load leaves the page empty', async () => {
    const repo = await import('@/data/repo')
    const spy = vi.spyOn(repo, 'getWatch').mockRejectedValueOnce(new Error('offline'))
    renderWithProviders(<WatchPage />, opts)
    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(document.querySelector('main')).toBeNull()
    spy.mockRestore()
  })
})

test('fixtures are reachable through the repo', async () => {
  expect((await getCommunity()).suburbs).toHaveLength(15)
  expect((await getWatch()).reports).toHaveLength(8)
  await act(async () => {})
})
