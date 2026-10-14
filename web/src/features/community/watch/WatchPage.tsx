'use client'

import { PageError } from '@/features/shared/PageError'
import { useWatch } from '../useCommunity'
import { CommunityKpis } from '../shared'
import { CalloutsCard } from './CalloutsCard'
import { FeedCard } from './FeedCard'
import { ReportsCard } from './ReportsCard'
import { ScamsCard } from './ScamsCard'

/** Community view · Neighbourhood watch (`<main data-page="watch">`). Nothing here is `<Locked>` (R13). */
export function WatchPage() {
  const res = useWatch()
  const w = res.data
  if (res.status === 'error') return <PageError page="watch" onRetry={res.retry} />
  if (!w) return null
  return (
    <main className="grid" data-page="watch">
      <CommunityKpis id="watchKpis" kpis={w.kpis} />
      <ReportsCard rows={w.reports} />
      <ScamsCard weeks={w.scams} labels={w.scamLabels} />
      <FeedCard items={w.feed} />
      <CalloutsCard items={w.callouts} />
    </main>
  )
}
