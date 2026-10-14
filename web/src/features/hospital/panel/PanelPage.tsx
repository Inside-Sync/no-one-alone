'use client'

import { HospitalKpis } from '../shared'
import { useHospital } from '../useHospital'
import { PatientsCard } from './PatientsCard'
import { ScatterCard } from './ScatterCard'

/** Hospital view · Patient panel (`<main data-page="panel">`). */
export function PanelPage() {
  const h = useHospital()
  if (!h) return null
  return (
    <main className="grid" data-page="panel">
      <HospitalKpis id="panelKpis" kpis={h.panel.kpis} />
      <PatientsCard rows={h.panel.rows} />
      <ScatterCard panel={h.panel} />
    </main>
  )
}
