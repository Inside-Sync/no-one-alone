'use client'

import { useEffect, useState } from 'react'
import { getCityScene, getSurroundings } from '@/data/repo'
import type { CityGeometry, Surroundings } from '@/data/types'
import { AirCard } from './AirCard'
import { AlertsCard } from './AlertsCard'
import { EnvKpis } from './EnvKpis'
import { NewsCard } from './NewsCard'
import { ThursdayCard } from './ThursdayCard'
import { WatchMapCard } from './WatchMapCard'
import { WeatherCard } from './WeatherCard'

interface AroundData {
  s: Surroundings
  city: CityGeometry
}

function useAroundData(): AroundData | null {
  const [data, setData] = useState<AroundData | null>(null)
  useEffect(() => {
    let live = true
    Promise.all([getSurroundings('margaret'), getCityScene()]).then(([s, city]) => {
      if (live) setData({ s, city })
    })
    return () => { live = false }
  }, [])
  return data
}

/**
 * Individual view · Around her (`<main data-page="around">`). No card carries a
 * consent category in the prototype (`scat`), so nothing here is `<Locked>`.
 */
export function AroundPage() {
  const d = useAroundData()
  if (!d) return null
  const { s, city } = d
  return (
    <main className="grid" data-page="around">
      <WatchMapCard s={s} geometry={city} />
      <WeatherCard s={s} />
      <EnvKpis kpis={s.kpis} />
      <AlertsCard heading={s.alertsHeading} alerts={s.alerts} />
      <NewsCard s={s} />
      <ThursdayCard thursday={s.thursday} />
      <AirCard air={s.air} note={s.airNote} />
    </main>
  )
}
