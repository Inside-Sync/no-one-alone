'use client'

import type { ComponentType } from 'react'
import { PopulationPage } from './government/population/PopulationPage'
import { SignalsPage } from './government/signals/SignalsPage'
import { EdPage } from './hospital/ed/EdPage'
import { OverviewPage } from './hospital/overview/OverviewPage'
import { PatientsPage } from './hospital/patients/PatientsPage'
import { ReferralsPage } from './hospital/referrals/ReferralsPage'
import { ReviewPage } from './hospital/review/ReviewPage'
import { AroundPage } from './individual/around/AroundPage'
import { DevicePage } from './individual/device/DevicePage'
import { HealthPage } from './individual/health/HealthPage'
import { LineagePage } from './individual/lineage/LineagePage'
import { LivePage } from './individual/live/LivePage'
import { MePage } from './individual/me/MePage'
import { RecordPage } from './individual/record/RecordPage'
import { TreatmentPage } from './individual/treatment/TreatmentPage'

/**
 * Page registry: `${view}/${page}` -> component, one entry for every route in `allRoutes()`.
 * `hospital/review` and `individual/live` are routed pages without a tab of their own.
 */
export const PAGE_REGISTRY: Record<string, ComponentType> = {
  'individual/me': MePage,
  'individual/health': HealthPage,
  'individual/record': RecordPage,
  'individual/treatment': TreatmentPage,
  'individual/around': AroundPage,
  'individual/lineage': LineagePage,
  'individual/device': DevicePage,
  'individual/live': LivePage,
  'hospital/overview': OverviewPage,
  'hospital/patients': PatientsPage,
  'hospital/referrals': ReferralsPage,
  'hospital/ed': EdPage,
  'hospital/review': ReviewPage,
  'government/population': PopulationPage,
  'government/signals': SignalsPage,
}
