'use client'

import { useEffect, useState } from 'react'
import { getCareCircle, getCityScene, getForecast, getHealth, getOrbitScene, getPerson, getSurroundings } from '@/data/repo'
import type { CircleMember, CityGeometry, Forecast, HealthData, OrbitScene, Person, Surroundings } from '@/data/types'
import { ChatCard } from './ChatCard'
import { CircleCard } from './CircleCard'
import { ComingUpCard } from './ComingUpCard'
import { HelperCard } from './HelperCard'
import { HomeTodayCard } from './HomeTodayCard'
import { KpiRow } from './KpiRow'
import { MapCard } from './MapCard'
import { NearCard } from './NearCard'
import { ProfileCard } from './ProfileCard'
import { RhythmCard } from './RhythmCard'
import { TodayCard } from './TodayCard'
import { WellbeingCard } from './WellbeingCard'

interface HomeData {
  person: Person
  health: HealthData
  forecast: Forecast
  surroundings: Surroundings
  circle: CircleMember[]
  city: CityGeometry
  orbit: OrbitScene
}

/** Everything the page shows, read once through the repo. */
function useHomeData(): HomeData | null {
  const [data, setData] = useState<HomeData | null>(null)
  useEffect(() => {
    let live = true
    Promise.all([
      getPerson('margaret'), getHealth('margaret'), getForecast('margaret'), getSurroundings('margaret'),
      getCareCircle('margaret'), getCityScene(), getOrbitScene(),
    ]).then(([person, health, forecast, surroundings, circle, city, orbit]) => {
      if (live) setData({ person, health, forecast, surroundings, circle, city, orbit })
    })
    return () => { live = false }
  }, [])
  return data
}

/** Individual view · Home (`<main data-page="home">`): sections in the prototype's order and spans. */
export function HomePage() {
  const d = useHomeData()
  if (!d) return null
  return (
    <main className="grid" data-page="home">
      <MapCard map={d.surroundings.homeMap} geometry={d.city} />
      <TodayCard person={d.person} />
      <ProfileCard person={d.person} />
      <KpiRow kpis={d.person.kpis} />
      <WellbeingCard forecast={d.forecast} />
      <RhythmCard rhythm={d.health.rhythm} />
      <ComingUpCard forecast={d.forecast} />
      <CircleCard scene={d.orbit} members={d.circle} />
      <ChatCard chat={d.health.todayChat} />
      <HomeTodayCard home={d.health.homeToday} />
      <NearCard nearby={d.surroundings.nearby} />
      <HelperCard log={d.person.helperLog} />
    </main>
  )
}
