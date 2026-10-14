'use client'

import { useEffect, useState } from 'react'
import { getCityScene, getCommunity, getWatch } from '@/data/repo'
import type { CityView, CommunityData, WatchData } from '@/data/types'

/** Runs `load` once; a failed load leaves the page empty and the shell usable. */
function useLoaded<T>(load: () => Promise<T>): T | null {
  const [data, setData] = useState<T | null>(null)
  useEffect(() => {
    let live = true
    load()
      .then((d) => { if (live) setData(d) })
      .catch(() => { /* the shell stays usable without the page body */ })
    return () => { live = false }
    // `load` is a module-level repo function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return data
}

export const useCommunity = (): CommunityData | null => useLoaded(getCommunity)
export const useWatch = (): WatchData | null => useLoaded(getWatch)

/** Camera preset of the district map. Separate from the page data: the controls do not wait for it. */
export function useDistrictView(): CityView | null {
  const geometry = useLoaded(getCityScene)
  return geometry?.views.district ?? null
}
