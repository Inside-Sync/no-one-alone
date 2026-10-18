'use client'

import { getCityScene, getSurroundings } from '@/data/repo'
import type { CityGeometry, Surroundings } from '@/data/types'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useRepo } from '@/features/shared/useRepo'
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

const loadAround = (): Promise<AroundData> =>
  Promise.all([getSurroundings('margaret'), getCityScene()]).then(([s, city]) => ({ s, city }))

/**
 * Individual view · Around her (`<main data-page="around">`). No card carries a
 * consent category in the prototype (`scat`), so nothing here is `<Locked>`.
 */
export function AroundPage() {
  const r = useRepo(loadAround)
  if (r.status === 'error') return <PageError page="around" onRetry={r.retry} />
  const d = r.data
  if (!d) return <PageSkeleton page="around" />
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
