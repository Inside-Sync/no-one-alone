import { Bars } from '@/components/charts/Bars'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { CommunityData } from '@/data/types'
import { Head } from '../../individual/home/parts'

/** `Emergency demand forecast` (c4): a week of 75+ presentations against the comfort line. */
export function EdForecastCard({ forecast }: { forecast: CommunityData['edForecast'] }) {
  const { t } = useTranslation('community')
  const th = forecast.threshold
  return (
    <GlassCard span={4}>
      <Head title={t('overview.edForecast.title')} meta={forecast.meta} />
      <div id="edf">
        <Bars values={forecast.values.map((d) => d.value)} labels={forecast.values.map((d) => d.day)} goal={{ value: th.value, label: th.label }} max={th.max} unit={th.unit} />
      </div>
      <p className="fine">{forecast.note}</p>
    </GlassCard>
  )
}
