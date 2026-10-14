'use client'

import type { ComponentType } from 'react'
import { DemandPage } from './hospital/demand/DemandPage'
import { DischargePage } from './hospital/discharge/DischargePage'
import { EdPage } from './hospital/ed/EdPage'
import { PanelPage } from './hospital/panel/PanelPage'
import { AroundPage } from './individual/around/AroundPage'
import { DevicePage } from './individual/device/DevicePage'
import { ForecastPage } from './individual/forecast/ForecastPage'
import { HealthPage } from './individual/health/HealthPage'
import { HomePage } from './individual/home/HomePage'
import { LineagePage } from './individual/lineage/LineagePage'
import { LivePage } from './individual/live/LivePage'
import { MePage } from './individual/me/MePage'
import { PrivacyPage } from './individual/privacy/PrivacyPage'
import { RecordPage } from './individual/record/RecordPage'

/**
 * Page registry: `${view}/${page}` -> component. Later tasks (7-13) add one
 * entry per page here; pages without an entry render the placeholder.
 */
export const PAGE_REGISTRY: Record<string, ComponentType> = {
  'individual/home': HomePage,
  'individual/health': HealthPage,
  'individual/around': AroundPage,
  'individual/forecast': ForecastPage,
  'individual/lineage': LineagePage,
  'individual/record': RecordPage,
  'individual/live': LivePage,
  'individual/me': MePage,
  'individual/privacy': PrivacyPage,
  'individual/device': DevicePage,
  'hospital/ed': EdPage,
  'hospital/panel': PanelPage,
  'hospital/demand': DemandPage,
  'hospital/discharge': DischargePage,
}
