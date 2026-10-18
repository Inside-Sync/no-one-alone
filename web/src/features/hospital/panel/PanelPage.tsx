'use client'

import { HospitalKpis } from '../shared'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useHospital } from '../useHospital'
import { PatientsCard } from './PatientsCard'
import { ScatterCard } from './ScatterCard'

/** Hospital view · Patient panel (`<main data-page="panel">`). */
export function PanelPage() {
  const res = useHospital()
  const h = res.data
  if (res.status === 'error') return <PageError page="panel" onRetry={res.retry} />
  if (!h) return <PageSkeleton page="panel" />
  return (
    <main className="grid" data-page="panel">
      <HospitalKpis id="panelKpis" kpis={h.panel.kpis} />
      <PatientsCard rows={h.panel.rows} />
      <ScatterCard panel={h.panel} />
    </main>
  )
}
