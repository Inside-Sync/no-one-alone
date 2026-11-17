'use client'

import { getCityScene, getGovernment, getSignals } from '@/data/repo'
import type { CityView, GovernmentData, SignalsData } from '@/data/types'
import { useRepo, type RepoResult } from '@/features/shared/useRepo'

export const useGovernment = (): RepoResult<GovernmentData> => useRepo(getGovernment)
export const useSignals = (): RepoResult<SignalsData> => useRepo(getSignals)

/**
 * Camera preset of the district map. Separate from the page data: the controls do not wait for it,
 * and if it fails the map simply keeps its default camera.
 */
export function useDistrictView(): CityView | null {
  return useRepo(getCityScene).data?.views.district ?? null
}
