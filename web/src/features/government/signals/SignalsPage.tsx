'use client'

import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useSignals } from '../useGovernment'
import { GovernmentKpis } from '../shared'
import { DecisionsCard } from './DecisionsCard'
import { FeedCard } from './FeedCard'
import { SignalsTableCard } from './SignalsTableCard'
import { WeeklyCard } from './WeeklyCard'

/** Government view · Programme signals (`<main data-page="signals">`). Nothing here is `<Locked>` (R13). */
export function SignalsPage() {
  const res = useSignals()
  const w = res.data
  if (res.status === 'error') return <PageError page="signals" onRetry={res.retry} />
  if (!w) return <PageSkeleton page="signals" />
  return (
    <main className="grid" data-page="signals">
      <GovernmentKpis id="watchKpis" kpis={w.kpis} columns={4} />
      <SignalsTableCard rows={w.signals} />
      <WeeklyCard weeks={w.weekly} labels={w.weeklyLabels} />
      <FeedCard items={w.feed} />
      <DecisionsCard items={w.decisions} />
      <p className="fine c12">{w.footnote}</p>
    </main>
  )
}
