'use client'

import { useEffect, useState } from 'react'
import { getForecast } from '@/data/repo'
import type { Forecast } from '@/data/types'
import type { SimInput } from '@/domain/riskSim'
import { BpProjectionCard } from './BpProjectionCard'
import { ModelCard } from './ModelCard'
import { ModesRow } from './ModesRow'
import { RisksCard } from './RisksCard'
import { ShapCard } from './ShapCard'
import { SignsCard } from './SignsCard'
import { SimCard } from './SimCard'

function useForecast(): Forecast | null {
  const [data, setData] = useState<Forecast | null>(null)
  useEffect(() => {
    let live = true
    getForecast('margaret').then((f) => { if (live) setData(f) })
    return () => { live = false }
  }, [])
  return data
}

const initialSim = (f: Forecast): SimInput => {
  const [adherence, steps, salt] = f.sim.sliders
  return { adherence: adherence.value, steps: steps.value, salt: salt.value as SimInput['salt'], hearingAids: f.sim.hearingAids }
}

function ForecastBody({ f }: { f: Forecast }) {
  const [sim, setSim] = useState<SimInput>(() => initialSim(f))
  return (
    <main className="grid" data-page="forecast">
      <ModelCard model={f.model} meta={f.modelMeta} />
      <RisksCard risks={f.risks} />
      <SimCard sim={f.sim} value={sim} onChange={setSim} />
      <BpProjectionCard bp={f.bp} adherence={sim.adherence} />
      <ShapCard shap={f.shap} note={f.shapNote} />
      <SignsCard signs={f.signs} />
      <ModesRow modes={f.modes} />
    </main>
  )
}

/** Individual view · What's ahead (`<main data-page="forecast">`). No card is consent-tagged in the prototype. */
export function ForecastPage() {
  const f = useForecast()
  return f ? <ForecastBody f={f} /> : null
}
