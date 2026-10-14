'use client'

import { getCityScene, getCommunity, getWatch } from '@/data/repo'
import type { CityView, CommunityData, WatchData } from '@/data/types'
import { useRepo, type RepoResult } from '@/features/shared/useRepo'

export const useCommunity = (): RepoResult<CommunityData> => useRepo(getCommunity)
export const useWatch = (): RepoResult<WatchData> => useRepo(getWatch)

/**
 * Camera preset of the district map. Separate from the page data: the controls do not wait for it,
 * and if it fails the map simply keeps its default camera.
 */
export function useDistrictView(): CityView | null {
  return useRepo(getCityScene).data?.views.district ?? null
}
