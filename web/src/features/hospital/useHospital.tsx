'use client'

import { useEffect, useState } from 'react'
import { getHospital } from '@/data/repo'
import type { HospitalData } from '@/data/types'

/** Loads the hospital fixture once; a failed load leaves the page empty and the shell usable. */
export function useHospital(): HospitalData | null {
  const [data, setData] = useState<HospitalData | null>(null)
  useEffect(() => {
    let live = true
    getHospital()
      .then((h) => { if (live) setData(h) })
      .catch(() => { /* the shell stays usable without the page body */ })
    return () => { live = false }
  }, [])
  return data
}
