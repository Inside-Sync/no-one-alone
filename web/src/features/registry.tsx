'use client'

import type { ComponentType } from 'react'
import { AroundPage } from './individual/around/AroundPage'
import { ForecastPage } from './individual/forecast/ForecastPage'
import { HealthPage } from './individual/health/HealthPage'
import { HomePage } from './individual/home/HomePage'

/**
 * Page registry: `${view}/${page}` -> component. Later tasks (7-13) add one
 * entry per page here; pages without an entry render the placeholder.
 */
export const PAGE_REGISTRY: Record<string, ComponentType> = {
  'individual/home': HomePage,
  'individual/health': HealthPage,
  'individual/around': AroundPage,
  'individual/forecast': ForecastPage,
}
