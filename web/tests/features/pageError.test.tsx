import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import type { ComponentType } from 'react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import common from '@/locales/en/common.json'
import { resetDataSource, setDataSource, type DataSource } from '@/data/repo'
import { mockSource, resetMockSource } from '@/data/sources/mock'
import { PopulationPage } from '@/features/government/population/PopulationPage'
import { SignalsPage } from '@/features/government/signals/SignalsPage'
import { OverviewPage } from '@/features/hospital/overview/OverviewPage'
import { EdPage } from '@/features/hospital/ed/EdPage'
import { PatientsPage } from '@/features/hospital/patients/PatientsPage'
import { AroundPage } from '@/features/individual/around/AroundPage'
import { DevicePage } from '@/features/individual/device/DevicePage'
import { HealthPage } from '@/features/individual/health/HealthPage'
import { LineagePage } from '@/features/individual/lineage/LineagePage'
import { LivePage } from '@/features/individual/live/LivePage'
import { RecordPage } from '@/features/individual/record/RecordPage'
import { mockCanvas, mockLayout, mockRaf } from '../canvas/fakeCtx'
import { renderWithProviders } from '../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/health/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

/** The mock source with some reads rejecting, like an offline Firestore. */
function failing(...methods: (keyof DataSource)[]): DataSource {
  const out: DataSource = { ...mockSource }
  for (const m of methods) (out as unknown as Record<string, () => Promise<never>>)[m] = () => Promise.reject(new Error('offline'))
  return out
}

const unhandled: unknown[] = []
const onUnhandled = (reason: unknown) => { unhandled.push(reason) }

beforeEach(() => {
  mockCanvas()
  mockLayout()
  mockRaf()
  resetMockSource()
  unhandled.length = 0
  process.on('unhandledRejection', onUnhandled)
})
afterEach(() => {
  process.off('unhandledRejection', onUnhandled)
  resetDataSource()
})

const settle = () => new Promise((r) => setTimeout(r, 20))

/** One page per view is required (health, ed, government); the rest are cheap to cover too. */
const CASES: [name: string, Page: ComponentType, page: string, fail: keyof DataSource, who: 'self' | 'family'][] = [
  ['individual/health', HealthPage, 'health', 'getHealth', 'self'],
  ['individual/around', AroundPage, 'around', 'getSurroundings', 'self'],
  ['individual/lineage', LineagePage, 'lineage', 'getLineage', 'self'],
  ['individual/record', RecordPage, 'record', 'getCareRecord', 'self'],
  ['individual/device', DevicePage, 'device', 'getDeviceFeed', 'self'],
  ['hospital/ed', EdPage, 'ed', 'getHospital', 'family'],
  ['hospital/patients', PatientsPage, 'patients', 'getPatients', 'family'],
  ['hospital/overview', OverviewPage, 'overview', 'getOverview', 'family'],
  ['government/population', PopulationPage, 'population', 'getGovernment', 'family'],
  ['government/signals', SignalsPage, 'signals', 'getSignals', 'family'],
]

test.each(CASES)('%s: a failed load shows PageError and "Try again" recovers', async (_n, Page, page, fail, who) => {
  setDataSource(failing(fail))
  renderWithProviders(<MemoryRouter><Page /></MemoryRouter>, { who })
  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent(common.pageError.text)
  expect(document.querySelector(`main[data-page="${page}"]`)).not.toBeNull()
  // Only the error card: none of the page's cards.
  expect(document.querySelectorAll('main article')).toHaveLength(1)

  resetDataSource()
  fireEvent.click(screen.getByRole('button', { name: common.pageError.retry }))
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  await waitFor(() => expect(document.querySelectorAll(`main[data-page="${page}"] h2`).length).toBeGreaterThan(0))
  await settle()
  expect(unhandled).toEqual([])
})

test('a retry that fails again keeps the error card', async () => {
  setDataSource(failing('getHospital'))
  renderWithProviders(<EdPage />, { who: 'family' })
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: common.pageError.retry }))
  expect(await screen.findByRole('alert')).toHaveTextContent(common.pageError.text)
  await settle()
  expect(unhandled).toEqual([])
})

test('Live: a failed orbit scene never blocks the safety controls (no PageError, no canvas)', async () => {
  setDataSource(failing('getOrbitScene'))
  const r = renderWithProviders(<LivePage />, { who: 'family' })
  act(() => { r.app().dispatchEmergency({ type: 'start' }) })
  expect(await screen.findByRole('button', { name: /pause/i })).toBeInTheDocument()
  await settle()
  expect(screen.queryByRole('alert')).toBeNull()
  expect(document.querySelector('main[data-page="live"] canvas')).toBeNull()
  expect(unhandled).toEqual([])
})

test('Device: a failed mini orbit leaves its area empty but the phone screen works', async () => {
  setDataSource(failing('getOrbitScene'))
  renderWithProviders(<DevicePage />, { who: 'self' })
  await waitFor(() => expect(document.getElementById('devHome')).not.toBeNull())
  await settle()
  expect(screen.queryByRole('alert')).toBeNull()
  expect(document.querySelector('main[data-page="device"] canvas')).toBeNull()
  expect(unhandled).toEqual([])
})
