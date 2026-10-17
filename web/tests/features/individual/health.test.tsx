import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { HealthPage } from '@/features/individual/health/HealthPage'
import { PAGE_REGISTRY } from '@/features/registry'
import { renderWithProviders } from '../../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/health/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const ready = () => screen.findByText('Where this comes from')
const svgByLabel = (re: RegExp) => screen.getByRole('img', { name: re })

test('is registered for individual/health', () => {
  expect(PAGE_REGISTRY['individual/health']).toBe(HealthPage)
})

test('shows every section heading in prototype order', async () => {
  renderWithProviders(<HealthPage />, { who: 'self' })
  await ready()
  const heads = Array.from(document.querySelectorAll('main h2')).map((h) => h.textContent)
  expect(heads).toEqual([
    "Today's goals", 'Heartbeat over the last day',
    'Heart', 'Heartbeat and breathing', 'Moving and energy', 'Walking and balance', 'Sleep', 'Mood and company',
    'Body and food', 'Hearing and senses', 'Tablets and blood pressure',
    "Last night's sleep", 'Mood, last 2 weeks', 'Steps, last 2 weeks', 'Blood pressure, last 2 weeks', 'Where this comes from',
  ])
  expect(screen.getByText('22:41 – 05:58 · 6 h 12 min asleep')).toBeInTheDocument()
  expect(screen.getByText('Goal 3,500')).toBeInTheDocument()
})

test('steps chart draws goal line at 3500', async () => {
  renderWithProviders(<HealthPage />, { who: 'self' })
  await ready()
  const svg = svgByLabel(/Steps over 14 days, goal met on 7 days/)
  const line = svg.querySelector('line[stroke-dasharray="4 3"]')!
  expect(Number(line.getAttribute('y1'))).toBeCloseTo(120 - (3500 / 5000) * 110)
  expect(within(svg as unknown as HTMLElement).getByText('goal 3,500')).toBeInTheDocument()
  expect(svg.querySelectorAll('rect[fill="#1fb39c"]')).toHaveLength(8) // the prototype's aria-label says 7; its own data has 8 days at or over 3,500
  expect(within(svg as unknown as HTMLElement).getByText('today')).toBeInTheDocument()
})

test('goal gauges, totals and mood notes render', async () => {
  renderWithProviders(<HealthPage />, { who: 'self' })
  await ready()
  expect(screen.getByText('of 300 kcal')).toBeInTheDocument()
  expect(screen.getByText('of 12 hours')).toBeInTheDocument()
  expect(screen.getByText('1,640')).toBeInTheDocument()
  expect(screen.getByText('Better on walking-group days')).toHaveClass('pill', 'good')
  expect(screen.getByText('Most mentioned: family, garden, weather')).toHaveClass('pill', 'plain')
})

test('devices table lists all seven sources and a row opens its drawer', async () => {
  renderWithProviders(<HealthPage />, { who: 'self' })
  await ready()
  const row = screen.getByText('Bluetooth BP cuff').closest('tr')!
  expect(row.closest('tbody')!.querySelectorAll('tr')).toHaveLength(7)
  expect(screen.getByText('64% · on wrist')).toHaveClass('pill', 'good')
  fireEvent.click(row)
  const drawer = document.getElementById('drawer')!
  expect(within(drawer).getByRole('heading', { name: 'Bluetooth BP cuff' })).toBeInTheDocument()
  expect(within(drawer).getByText('Morning + evening')).toBeInTheDocument()
  fireEvent.click(within(drawer).getByRole('button', { name: 'Share with family' }))
  expect(document.getElementById('toast')!.textContent).toBe('Shared')
})

test('a metric tile opens its info drawer', async () => {
  renderWithProviders(<HealthPage />, { who: 'self' })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: /Walking speed/ }))
  const drawer = document.getElementById('drawer')!
  expect(within(drawer).getByText(/one of the best early signs of a higher chance of falling/)).toBeInTheDocument()
})

const HEART = ['Heart rate over 24 hours', 'Morning systolic rose', '>At rest<', '>Uneven heartbeat<', '>Weight<']
const SLEEP = ['Sleep stages: 6 wakes', '>Asleep<']
const ACTIVITY = ['Steps over 14 days', '>Steps<', '>Walking speed<']
const MOOD = ['Mood over 14 days', '>Mood today<', 'Better on walking-group days']
const MEDS = ['>Taken on time<', '>Morning BP<']
const SPEECH = ['>Noise around her<', '>Hearing aids<']
/** Group labels are matched as whole text nodes (`>Weight<`): a bare word also turns up in longer copy. */
const html = () => document.body.innerHTML
const absent = (list: string[]) => list.forEach((t) => expect(html()).not.toContain(t))
const present = (list: string[]) => list.forEach((t) => expect(html()).toContain(t))

test('self view shows every category', async () => {
  renderWithProviders(<HealthPage />, { who: 'self' })
  await ready()
  present([...HEART, ...SLEEP, ...ACTIVITY, ...MOOD, ...MEDS, ...SPEECH])
})

test('viewer without mood access gets no mood card or mood group in the DOM', async () => {
  renderWithProviders(<HealthPage />, { who: 'family', viewer: 'james' }) // james: mood off by default
  await ready()
  absent(MOOD)
  present([...SLEEP, ...HEART])
  expect(screen.getAllByText('Margaret keeps her mood and feelings private').length).toBe(2)
})

test('heart off removes the heartbeat, blood pressure and both heart group cards', async () => {
  const r = renderWithProviders(<HealthPage />, { who: 'family', viewer: 'sarah' })
  await ready()
  present(HEART)
  act(() => r.app().toggleShare('sarah', 'heart'))
  await waitFor(() => expect(screen.queryByText('Heartbeat over the last day')).toBeNull())
  absent(HEART)
  present([...SLEEP, ...ACTIVITY]) // other categories stay
  expect(screen.getByText("Today's goals")).toBeInTheDocument() // untagged card stays
})

test('sleep off removes the sleep chart and the sleep group', async () => {
  const r = renderWithProviders(<HealthPage />, { who: 'family', viewer: 'sarah' })
  await ready()
  act(() => r.app().toggleShare('sarah', 'sleep'))
  await waitFor(() => expect(screen.queryByText("Last night's sleep")).toBeNull())
  absent([...SLEEP, '22:41 – 05:58'])
})

test('activity off removes the steps chart and both activity groups', async () => {
  const r = renderWithProviders(<HealthPage />, { who: 'family', viewer: 'sarah' })
  await ready()
  act(() => r.app().toggleShare('sarah', 'activity'))
  await waitFor(() => expect(screen.queryByText('Steps, last 2 weeks')).toBeNull())
  absent(ACTIVITY)
})

test('pausing sharing removes every category card but keeps the untagged ones', async () => {
  const r = renderWithProviders(<HealthPage />, { who: 'family', viewer: 'james' })
  await ready()
  present([...HEART, ...SLEEP])
  act(() => r.app().togglePause())
  await waitFor(() => expect(screen.queryByText('Heartbeat over the last day')).toBeNull())
  absent([...HEART, ...SLEEP, ...ACTIVITY, ...MOOD, ...MEDS, ...SPEECH])
  expect(screen.getAllByText('Margaret paused sharing until tomorrow').length).toBe(9 + 5)
  expect(screen.getByText("Today's goals")).toBeInTheDocument()
  expect(screen.getByText('Where this comes from')).toBeInTheDocument()
})
