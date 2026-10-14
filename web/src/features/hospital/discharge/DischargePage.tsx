'use client'

import { HospitalKpis } from '../shared'
import { PageError } from '@/features/shared/PageError'
import { useHospital } from '../useHospital'
import { BoardCard } from './BoardCard'

/** Hospital view · Discharge follow-up (`<main data-page="discharge">`). */
export function DischargePage() {
  const res = useHospital()
  const h = res.data
  if (res.status === 'error') return <PageError page="discharge" onRetry={res.retry} />
  if (!h) return null
  return (
    <main className="grid" data-page="discharge">
      <HospitalKpis id="disKpis" kpis={h.discharge.kpis} />
      <BoardCard board={h.discharge.board} />
    </main>
  )
}
