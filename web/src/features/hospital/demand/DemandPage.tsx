'use client'

import { useHospital } from '../useHospital'
import { ActionsCard } from './ActionsCard'
import { BedsCard } from './BedsCard'
import { DriversCard } from './DriversCard'
import { ForecastCard } from './ForecastCard'

/** Hospital view · Demand forecast (`<main data-page="demand">`). */
export function DemandPage() {
  const h = useHospital()
  if (!h) return null
  return (
    <main className="grid" data-page="demand">
      <ForecastCard demand={h.demand} />
      <BedsCard demand={h.demand} />
      <DriversCard drivers={h.demand.drivers} />
      <ActionsCard actions={h.demand.actions} />
    </main>
  )
}
