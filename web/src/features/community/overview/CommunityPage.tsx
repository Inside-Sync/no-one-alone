'use client'

import { PageError } from '@/features/shared/PageError'
import { useCommunity, useDistrictView } from '../useCommunity'
import { CommunityKpis } from '../shared'
import { CapacityCard } from './CapacityCard'
import { DistrictCard } from './DistrictCard'
import { EdForecastCard } from './EdForecastCard'
import { FunnelCard } from './FunnelCard'
import { HeatwaveCard } from './HeatwaveCard'
import { LanguagesCard } from './LanguagesCard'
import { ProgramsCard } from './ProgramsCard'
import { VisitsCard } from './VisitsCard'
import { WatchSummaryCard } from './WatchSummaryCard'

/**
 * Community view · Overview (`<main data-page="community">`). No card carries a
 * consent category (R13), so nothing here is `<Locked>`.
 */
export function CommunityPage() {
  const res = useCommunity()
  const c = res.data
  const view = useDistrictView()
  if (res.status === 'error') return <PageError page="community" onRetry={res.retry} />
  if (!c) return null
  return (
    <main className="grid" data-page="community">
      <CommunityKpis id="comKpis" kpis={c.kpis} />
      <DistrictCard suburbs={c.suburbs} kicker={c.districtKicker} view={view} />
      <HeatwaveCard plan={c.heatwave} />
      <VisitsCard rows={c.visits} />
      <FunnelCard stages={c.funnel} minis={c.funnelMinis} />
      <CapacityCard rows={c.capacity} />
      <EdForecastCard forecast={c.edForecast} />
      <LanguagesCard rows={c.languages} />
      <ProgramsCard rows={c.programs} />
      <WatchSummaryCard items={c.watchSummary} />
      <p className="fine c12">{c.footnote}</p>
    </main>
  )
}
