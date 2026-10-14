'use client'

import { getDeviceFeed, getHealth } from '@/data/repo'
import type { DeviceFeed, HealthData } from '@/data/types'
import { PageError } from '@/features/shared/PageError'
import { useRepo } from '@/features/shared/useRepo'
import { BpCard } from './BpCard'
import { DevicesCard } from './DevicesCard'
import { GoalsCard } from './GoalsCard'
import { GroupCards } from './GroupCards'
import { Hr24Card } from './Hr24Card'
import { HypnoCard } from './HypnoCard'
import { MoodCard } from './MoodCard'
import { StepsCard } from './StepsCard'

interface HealthPageData {
  health: HealthData
  feed: DeviceFeed
}

const loadHealth = (): Promise<HealthPageData> =>
  Promise.all([getHealth('margaret'), getDeviceFeed('margaret')]).then(([health, feed]) => ({ health, feed }))

/** Individual view · Health (`<main data-page="health">`): sections in the prototype's order and spans. */
export function HealthPage() {
  const r = useRepo(loadHealth)
  if (r.status === 'error') return <PageError page="health" onRetry={r.retry} />
  const d = r.data
  if (!d) return null
  const h = d.health
  return (
    <main className="grid" data-page="health">
      <GoalsCard health={h} />
      <Hr24Card hr={h.hr24} />
      <GroupCards groups={h.groups} />
      <HypnoCard hypnogram={h.hypnogram} />
      <MoodCard mood={h.mood14} />
      <StepsCard steps={h.steps14} goal={h.stepsGoal} />
      <BpCard bp={h.bp14} />
      <DevicesCard feed={d.feed} />
    </main>
  )
}
