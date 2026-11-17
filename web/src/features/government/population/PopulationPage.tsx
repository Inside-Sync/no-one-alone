'use client'

import { useTranslation } from 'react-i18next'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useGovernment, useDistrictView } from '../useGovernment'
import { GovernmentKpis } from '../shared'
import s from '../government.module.css'
import { BalanceCard } from './BalanceCard'
import { DistrictCard } from './DistrictCard'
import { FacilitiesCard } from './FacilitiesCard'
import { FunnelCard } from './FunnelCard'
import { ProgrammesCard } from './ProgrammesCard'
import { RecoveryCard } from './RecoveryCard'
import { ReferralsCard } from './ReferralsCard'
import { ScatterCard } from './ScatterCard'
import { ScreeningCard } from './ScreeningCard'
import { ShareCard } from './ShareCard'
import { SignalsSummaryCard } from './SignalsSummaryCard'
import { StalledCard } from './StalledCard'
import { WellbeingCard } from './WellbeingCard'

/**
 * Government view · Population health (`<main data-page="population">`). No card carries a
 * consent category (R13), so nothing here is `<Locked>`.
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
      <h2 className={`c12 ${s.sec}`}>{t('population.sections.health')}</h2>
      <WellbeingCard tiles={g.wellbeing} />
      <RecoveryCard recovery={g.recovery} />
      <h2 className={`c12 ${s.sec}`}>{t('population.sections.screening')}</h2>
      <GovernmentKpis id="comKpis" kpis={g.kpis} />
      <DistrictCard areas={g.areas} kicker={g.districtKicker} view={view} />
      <ScreeningCard screening={g.screening} />
      <ScatterCard facilities={g.facilities} />
      <BalanceCard facilities={g.facilities} balance={g.balance} />
      <FacilitiesCard facilities={g.facilities} />
      <StalledCard rows={g.stalled} />
      <FunnelCard stages={g.funnel} minis={g.funnelMinis} />
      <ReferralsCard rows={g.referrals} />
      <ShareCard id="langs" title={t('population.byLanguage.title')} meta={t('population.byLanguage.meta')} rows={g.byLanguage.rows} note={g.byLanguage.note} />
      <ShareCard id="contact" title={t('population.byContact.title')} meta={t('population.byContact.meta')} rows={g.byContact.rows} note={g.byContact.note} />
      <ProgrammesCard rows={g.programmes} />
      <SignalsSummaryCard items={g.signalsSummary} />
      <p className="fine c12">{g.footnote}</p>
    </main>
  )
}
