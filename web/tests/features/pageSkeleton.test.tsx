import { screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { vi } from 'vitest'
import common from '@/locales/en/common.json'
import { resetDataSource, setDataSource, type DataSource } from '@/data/repo'
import { mockSource } from '@/data/sources/mock'
import { CommunityPage } from '@/features/community/overview/CommunityPage'
import { WatchPage } from '@/features/community/watch/WatchPage'
import { DemandPage } from '@/features/hospital/demand/DemandPage'
import { DischargePage } from '@/features/hospital/discharge/DischargePage'
import { EdPage } from '@/features/hospital/ed/EdPage'
import { PanelPage } from '@/features/hospital/panel/PanelPage'
import { PatientPage } from '@/features/hospital/patient/PatientPage'
import { AroundPage } from '@/features/individual/around/AroundPage'
import { DevicePage } from '@/features/individual/device/DevicePage'
import { ForecastPage } from '@/features/individual/forecast/ForecastPage'
import { HealthPage } from '@/features/individual/health/HealthPage'
import { HomePage } from '@/features/individual/home/HomePage'
import { LineagePage } from '@/features/individual/lineage/LineagePage'
import { RecordPage } from '@/features/individual/record/RecordPage'
import { mockCanvas, mockLayout, mockRaf } from '../canvas/fakeCtx'
import { renderWithProviders } from '../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/home/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

/** The mock source with every read pending forever, like a slow first Firestore load. */
const pending = new Proxy(mockSource, { get: () => () => new Promise(() => {}) }) as DataSource

beforeEach(() => {
  mockCanvas()
  mockLayout()
  mockRaf()
  setDataSource(pending)
})
afterEach(() => resetDataSource())

const CASES: [page: string, Page: ComponentType, who: 'self' | 'family'][] = [
  ['home', HomePage, 'self'],
  ['health', HealthPage, 'self'],
  ['around', AroundPage, 'self'],
  ['forecast', ForecastPage, 'self'],
  ['lineage', LineagePage, 'self'],
  ['record', RecordPage, 'self'],
  ['device', DevicePage, 'self'],
  ['ed', EdPage, 'family'],
  ['panel', PanelPage, 'family'],
  ['demand', DemandPage, 'family'],
  ['discharge', DischargePage, 'family'],
  ['patient', PatientPage, 'family'],
  ['community', CommunityPage, 'family'],
  ['watch', WatchPage, 'family'],
]

test.each(CASES)('%s: while its data loads the page shows skeleton cards, not a blank screen', (page, Page, who) => {
  renderWithProviders(<Page />, { who })
  const main = screen.getByRole('main', { name: common.pageLoading })
  expect(main).toHaveAttribute('data-page', page)
  expect(main).toHaveAttribute('aria-busy', 'true')
  expect(main.querySelectorAll('article.glass').length).toBeGreaterThan(1)
})
