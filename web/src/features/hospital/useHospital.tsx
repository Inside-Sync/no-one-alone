'use client'

import { getHospital } from '@/data/repo'
import type { HospitalData } from '@/data/types'
import { useRepo, type RepoResult } from '@/features/shared/useRepo'

/** The hospital data every hospital page reads; `status: 'error'` lets the page show PageError. */
export function useHospital(): RepoResult<HospitalData> {
  return useRepo(getHospital)
}
