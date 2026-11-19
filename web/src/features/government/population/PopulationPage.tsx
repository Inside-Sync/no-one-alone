'use client'

import { useTranslation } from 'react-i18next'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useGovernment, useDistrictView } from '../useGovernment'
import s from '../government.module.css'
import { BalanceCard } from './BalanceCard'
import { DistrictCard } from './DistrictCard'
import { FacilitiesCard } from './FacilitiesCard'
import { PreventionSection } from './PreventionSection'
import { ProgrammesCard } from './ProgrammesCard'
import { RecoveryCard } from './RecoveryCard'
import { ScatterCard } from './ScatterCard'
import { ScreeningCard } from './ScreeningCard'
import { SignalsSummaryCard } from './SignalsSummaryCard'
import { WellbeingCard } from './WellbeingCard'

/**
 * Government view · Population health (`<main data-page="population">`). No card carries a
 * consent category (R13), so nothing here is `<Locked>`.
 *
 * The redesign opens with "Prevention and screening" and no longer shows the KPI strip (`GovernmentKpis id="comKpis"`)
 * nor the StalledCard, FunnelCard, ReferralsCard and the two ShareCards (by language, by contact). Their components and
 * data stay in place.
 */
export function PopulationPage() {
  const res = useGovernment()
  const g = res.data
  const view = useDistrictView()
  const { t } = useTranslation('government')
  if (res.status === 'error') return <PageError page="population" onRetry={res.retry} />
  if (!g) return <PageSkeleton page="population" />
  return (
    <main className="grid" data-page="population">
      <PreventionSection />
      <h2 className={`c12 ${s.sec}`}>{t('population.sections.health')}</h2>
      <WellbeingCard tiles={g.wellbeing} />
      <RecoveryCard recovery={g.recovery} />
      <h2 className={`c12 ${s.sec}`}>{t('population.sections.screening')}</h2>
      <DistrictCard areas={g.areas} kicker={g.districtKicker} view={view} />
      <ScreeningCard screening={g.screening} />
      <ScatterCard facilities={g.facilities} />
      <BalanceCard facilities={g.facilities} balance={g.balance} />
      <FacilitiesCard facilities={g.facilities} />
      <ProgrammesCard rows={g.programmes} />
      <SignalsSummaryCard items={g.signalsSummary} />
      <p className="fine c12">{g.footnote}</p>
    </main>
  )
}
