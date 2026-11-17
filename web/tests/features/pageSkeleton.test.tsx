import { screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import common from '@/locales/en/common.json'
import { resetDataSource, setDataSource, type DataSource } from '@/data/repo'
import { mockSource } from '@/data/sources/mock'
import { PopulationPage } from '@/features/government/population/PopulationPage'
import { SignalsPage } from '@/features/government/signals/SignalsPage'
import { OverviewPage } from '@/features/hospital/overview/OverviewPage'
import { ReferralsPage } from '@/features/hospital/referrals/ReferralsPage'
import { ReviewPage } from '@/features/hospital/review/ReviewPage'
import { EdPage } from '@/features/hospital/ed/EdPage'
import { PatientsPage } from '@/features/hospital/patients/PatientsPage'
import { AroundPage } from '@/features/individual/around/AroundPage'
import { DevicePage } from '@/features/individual/device/DevicePage'
import { HealthPage } from '@/features/individual/health/HealthPage'
import { LineagePage } from '@/features/individual/lineage/LineagePage'
import { RecordPage } from '@/features/individual/record/RecordPage'
import { mockCanvas, mockLayout, mockRaf } from '../canvas/fakeCtx'
import { renderWithProviders } from '../helpers/renderWithProviders'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/health/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

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
  ['health', HealthPage, 'self'],
  ['around', AroundPage, 'self'],
  ['lineage', LineagePage, 'self'],
  ['record', RecordPage, 'self'],
  ['device', DevicePage, 'self'],
  ['ed', EdPage, 'family'],
  ['patients', PatientsPage, 'family'],
  ['overview', OverviewPage, 'family'],
  ['review', ReviewPage, 'family'],
  ['referrals', ReferralsPage, 'family'],
  ['population', PopulationPage, 'family'],
  ['signals', SignalsPage, 'family'],
]

test.each(CASES)('%s: while its data loads the page shows skeleton cards, not a blank screen', (page, Page, who) => {
  renderWithProviders(<MemoryRouter><Page /></MemoryRouter>, { who })
  const main = screen.getByRole('main', { name: common.pageLoading })
  expect(main).toHaveAttribute('data-page', page)
  expect(main).toHaveAttribute('aria-busy', 'true')
  expect(main.querySelectorAll('article.glass').length).toBeGreaterThan(1)
})
