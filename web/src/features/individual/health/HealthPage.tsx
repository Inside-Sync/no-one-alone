'use client'

import { getHealth } from '@/data/repo'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useRepo } from '@/features/shared/useRepo'
import { BpCard } from './BpCard'
import { GoalsCard } from './GoalsCard'
import { GroupCards } from './GroupCards'
import { Hr24Card } from './Hr24Card'
import { HypnoCard } from './HypnoCard'
import { MoodCard } from './MoodCard'
import { StepsCard } from './StepsCard'

const loadHealth = () => getHealth('margaret')

/** Individual view · Health (`<main data-page="health">`): sections in the prototype's order and spans. */
export function HealthPage() {
  const r = useRepo(loadHealth)
  if (r.status === 'error') return <PageError page="health" onRetry={r.retry} />
  const h = r.data
  if (!h) return <PageSkeleton page="health" />
  return (
    <main className="grid" data-page="health">
      <GoalsCard health={h} />
      <Hr24Card hr={h.hr24} />
      <GroupCards groups={h.groups} />
      <HypnoCard hypnogram={h.hypnogram} />
      <MoodCard mood={h.mood14} />
      <StepsCard steps={h.steps14} goal={h.stepsGoal} />
      <BpCard bp={h.bp14} />
    </main>
  )
}
