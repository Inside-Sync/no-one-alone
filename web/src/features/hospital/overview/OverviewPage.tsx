'use client'

import { getOverview } from '@/data/repo'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useTranslation } from 'react-i18next'
import { useRepo } from '@/features/shared/useRepo'
import { HospitalKpis } from '../shared'
import { LoopCards } from '../loop/LoopCards'
import { useScreening } from '../loop/useScreening'
import { CapacityCard } from './CapacityCard'
import { ConditionsCard } from './ConditionsCard'
import { DepartmentsCard } from './DepartmentsCard'

/** Hospital view · Overview (`<main data-page="overview">`): KPIs, capacity, departments, outcomes by condition, then the screening-loop cards. */
export function OverviewPage() {
  const { t } = useTranslation('overview')
  const res = useRepo(getOverview)
  const loop = useScreening()
  if (res.status === 'error' || loop.status === 'error') return <PageError page="overview" onRetry={() => { res.retry(); loop.retry() }} />
  const o = res.data
  const s = loop.data
  if (!o || !s) return <PageSkeleton page="overview" />
  return (
    <main className="grid" data-page="overview">
      <HospitalKpis id="ovKpis" kpis={o.kpis} />
      <CapacityCard data={o} />
      <h2 className="c12 ov-sec">{t('sections.today')}</h2>
      <DepartmentsCard rows={o.departments} />
      <h2 className="c12 ov-sec">{t('sections.outcomes')}</h2>
      <ConditionsCard rows={o.conditions} />
      <h2 className="c12 ov-sec">{t('sections.loops')}</h2>
      <LoopCards s={s} />
    </main>
  )
}
