import { act, fireEvent, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { AroundPage } from '@/features/individual/around/AroundPage'
import { PAGE_REGISTRY } from '@/features/registry'
import { getSurroundings } from '@/data/repo'
import i18n from '@/i18n'
import { mockCanvas, mockLayout, mockRaf } from '../../canvas/fakeCtx'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/around/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

beforeEach(() => {
  mockCanvas()
  mockLayout()
  mockRaf()
})

const ready = () => screen.findByText('Air, pollen and smoke')
const newsItems = () => Array.from(document.querySelectorAll('ul.news > li'))

test('is registered for individual/around', () => {
  expect(PAGE_REGISTRY['individual/around']).toBe(AroundPage)
})

test('shows every section in prototype order', async () => {
  renderWithProviders(<AroundPage />, { who: 'self' })
  await ready()
  const heads = Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)
  expect(heads).toEqual([
    'Weather in Marrickville', 'Worth knowing, living alone', 'News that matters to her',
    'Thursday, hour by hour', 'Air, pollen and smoke',
  ])
  expect(screen.getByText("Around Margaret's home")).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /3D map of Margaret's streets with neighbourhood alerts/ })).toBeInTheDocument()
  expect(document.querySelector('.wx-now b')!.textContent).toBe('33°')
  expect(document.querySelectorAll('.week > div')).toHaveLength(7)
  expect(document.querySelectorAll('.kpis > .kpi')).toHaveLength(12)
})

test('news list filtered to her profile renders all NEWS items', async () => {
  const { news } = await getSurroundings('margaret')
  renderWithProviders(<AroundPage />, { who: 'self' })
  await ready()
  expect(news).toHaveLength(8)
  expect(newsItems()).toHaveLength(news.length)
  expect(screen.getByText('Shown because: lives alone, 3 reports on her street')).toBeInTheDocument()
  expect(screen.getByText('HEALTH · State health department')).toBeInTheDocument()
  expect(screen.getByText('2 h ago')).toBeInTheDocument()
})

test('news category filter narrows the list and marks the pressed button', async () => {
  renderWithProviders(<AroundPage />, { who: 'self' })
  await ready()
  const group = screen.getByRole('group', { name: 'News filter' })
  expect(within(group).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(within(group).getByRole('button', { name: 'Safety' }))
  expect(within(group).getByRole('button', { name: 'Safety' })).toHaveAttribute('aria-pressed', 'true')
  expect(within(group).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
  expect(newsItems()).toHaveLength(2)
  fireEvent.click(within(group).getByRole('button', { name: 'Weather' }))
  expect(newsItems()).toHaveLength(1)
})

test('a news item opens its drawer with actions', async () => {
  renderWithProviders(<AroundPage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByText('Southerly change Friday evening, gusts to 60 km/h'))
  const drawer = document.getElementById('drawer')!
  expect(within(drawer).getByText(/Secure outdoor furniture/)).toBeInTheDocument()
  fireEvent.click(within(drawer).getByRole('button', { name: 'Read it to Margaret' }))
  expect(document.getElementById('toast')!.textContent).toBe('She will hear a short version at 18:00')
})

test('alerts are sorted as the prototype lists them and open a drawer', async () => {
  renderWithProviders(<AroundPage />, { who: 'self' })
  await ready()
  const items = Array.from(document.querySelectorAll('ul.alerts > li'))
  expect(items).toHaveLength(7)
  expect(within(items[0] as HTMLElement).getByText('Act')).toBeInTheDocument()
  expect(within(items[2] as HTMLElement).getByText('Be aware')).toBeInTheDocument()
  expect(within(items[6] as HTMLElement).getByText('Helpful')).toBeInTheDocument()
  fireEvent.click(items[1])
  const drawer = document.getElementById('drawer')!
  expect(within(drawer).getByRole('heading', { name: 'Thursday heatwave, 38°' })).toBeInTheDocument()
  fireEvent.click(within(drawer).getByRole('button', { name: 'Mark as handled' }))
  expect(document.getElementById('toast')!.textContent).toBe('Marked as handled')
})

test('Thursday chart plots outdoor, indoor and the helper plan', async () => {
  renderWithProviders(<AroundPage />, { who: 'self' })
  await ready()
  const svg = screen.getByRole('img', { name: /Thursday outdoor temperature peaks at 38 degrees/ })
  expect(svg.querySelectorAll('path[fill="none"]')).toHaveLength(2)
  expect(svg.querySelector('path[stroke-dasharray="5 4"]')).not.toBeNull()
  expect(within(svg as unknown as HTMLElement).getByText('at library cool room')).toBeInTheDocument()
  expect(within(svg as unknown as HTMLElement).getAllByText('check-in')).toHaveLength(3)
  expect(within(svg as unknown as HTMLElement).getByText('22:00')).toBeInTheDocument()
})

test('air table has seven days and Saturday smoke', async () => {
  renderWithProviders(<AroundPage />, { who: 'self' })
  await ready()
  const sat = screen.getByText('Poor · 88').closest('tr')!
  expect(sat.closest('tbody')!.querySelectorAll('tr')).toHaveLength(7)
  expect(within(sat).getByText('Likely')).toBeInTheDocument()
  expect(screen.getByText(/Her inhaler reminder is on for those days/)).toBeInTheDocument()
})

test('rotating the watch map and tapping a weather tile work', async () => {
  renderWithProviders(<AroundPage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: 'Rotate left' }))
  fireEvent.click(screen.getByRole('button', { name: 'Rotate right' }))
  fireEvent.click(screen.getByRole('button', { name: /Fire danger/ }))
  expect(within(document.getElementById('drawer')!).getByText('Thu–Fri')).toBeInTheDocument()
})

test('an environment tile opens the explanation drawer', async () => {
  renderWithProviders(<AroundPage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByText('Sun strength'))
  expect(within(document.getElementById('drawer')!).getByText(/skin can burn in under 10 minutes/)).toBeInTheDocument()
})

test('family viewer still sees the surroundings page (no consent category)', async () => {
  renderWithProviders(<AroundPage />, { who: 'family', viewer: 'david' })
  await ready()
  expect(document.querySelectorAll('ul.alerts > li')).toHaveLength(7)
  expect(document.body.innerHTML).not.toContain('keeps her')
})

test('in Vietnamese the news categories and the age read naturally', async () => {
  await act(() => i18n.changeLanguage('vi'))
  try {
    renderWithProviders(<AroundPage />, { who: 'self' })
    await screen.findByText('Không khí, phấn hoa và khói')
    const group = screen.getByRole('group', { name: 'Lọc tin tức' })
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Tất cả', 'Sức khỏe', 'An toàn', 'Thời tiết', 'Cộng đồng', 'Giao thông'])
    fireEvent.click(within(group).getByRole('button', { name: 'An toàn' }))
    expect(newsItems()).toHaveLength(2)
    fireEvent.click(within(group).getByRole('button', { name: 'Tất cả' }))
    expect(screen.getByText('2 giờ trước')).toBeInTheDocument()
    expect(screen.getAllByText(/^SỨC KHỎE · /).length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toMatch(/ ago|HEALTH ·/)
  } finally {
    await act(() => i18n.changeLanguage('en'))
  }
})
