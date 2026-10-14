import { Bars } from '@/components/charts/Bars'
import { GlassCard } from '@/components/ui/GlassCard'
import { COMMUNITY_COPY } from '@/data/repo'
import type { CommunityData } from '@/data/types'
import { Head } from '../../individual/home/parts'

/** `Emergency demand forecast` (c4): a week of 75+ presentations against the comfort line. */
export function EdForecastCard({ forecast }: { forecast: CommunityData['edForecast'] }) {
  const t = forecast.threshold
  return (
    <GlassCard span={4}>
      <Head title={COMMUNITY_COPY.overview.edForecast.title} meta={forecast.meta} />
      <div id="edf">
        <Bars values={forecast.values.map((d) => d.value)} labels={forecast.values.map((d) => d.day)} goal={{ value: t.value, label: t.label }} max={t.max} unit={t.unit} />
      </div>
      <p className="fine">{forecast.note}</p>
    </GlassCard>
  )
}
