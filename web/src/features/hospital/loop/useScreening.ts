'use client'

import { getScreening } from '@/data/repo'
import type { ScreeningData } from '@/data/types'
import { useRepo, type RepoResult } from '@/features/shared/useRepo'

/** The data the three hospital screening pages read; `status: 'error'` lets a page show PageError. */
export function useScreening(): RepoResult<ScreeningData> {
  return useRepo(getScreening)
}
