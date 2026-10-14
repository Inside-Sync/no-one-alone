'use client'

import type { ComponentType } from 'react'
import { HomePage } from './individual/home/HomePage'

/**
 * Page registry: `${view}/${page}` -> component. Later tasks (7-13) add one
 * entry per page here; pages without an entry render the placeholder.
 */
export const PAGE_REGISTRY: Record<string, ComponentType> = {
  'individual/home': HomePage,
}
