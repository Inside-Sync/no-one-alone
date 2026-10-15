import { LineChart } from '@/components/charts/LineChart'
import { GlassCard } from '@/components/ui/GlassCard'
import { useTranslation } from 'react-i18next'
import type { Forecast } from '@/data/types'
import { bpProjection } from '@/domain/riskSim'
import { Head } from '../home/parts'
import { Legend } from '../health/Legend'

/** `Morning systolic blood pressure` (c7): observed 6 weeks, three projections, target band (`bpChart`, line 1449). */
export function BpProjectionCard({ bp, adherence }: { bp: Forecast['bp']; adherence: number }) {
  const { t } = useTranslation('forecast')
  const legend = t('bp.legend', { returnObjects: true })
  const { projected } = bpProjection(bp, adherence)
  const showWhatIf = adherence !== 86 && adherence !== 100
  const start = bp.todayWeek - 1
  return (
    <GlassCard span={7} className="chart">
      <Head title={t('bp.title')} meta={t('bp.meta')} />
      <div id="bpChart">
        <LineChart
          yLabel={t('bp.yLabel')}
          ariaLabel={t('bp.ariaLabel')}
          viewBox={[580, 214]}
          plot={{ left: 44, right: 548, top: 10, bottom: 196 }}
          x={{ count: bp.weeks, labels: Array.from({ length: bp.weeks }, (_, i) => ({ at: i, text: t('bp.weekLabel', { n: i + 1 }) })) }}
          y={{ min: bp.lo, max: bp.hi, ticks: [125, 135, 145, 155, 165] }}
          targetBand={{ from: bp.lo, to: bp.target, color: 'rgba(31,179,156,.10)' }}
          marker={{ at: start, label: t('bp.today') }}
          bands={[
            { values: bp.projectedNothing, spread: 2.2, color: 'rgba(217,68,63,.12)', start },
            { values: bp.projectedAdherent, spread: 2.2, color: 'rgba(31,179,156,.16)', start },
          ]}
          series={[
            { name: t('bp.series.nothing'), values: bp.projectedNothing, color: '#d9443f', dashed: true, start, endLabel: true },
            { name: t('bp.series.adherent'), values: bp.projectedAdherent, color: '#1fb39c', dashed: true, start, endLabel: '#0b7f71' },
            ...(showWhatIf ? [{ name: t('bp.series.whatIf'), values: projected, color: '#8f6fd0', start, endLabel: true }] : []),
            { name: t('bp.series.observed'), values: bp.observed, color: '#c88a05', area: 'rgba(200,138,5,.12)', dots: { r: 3.2, lastR: 5.5, hollow: true } },
          ]}
        />
      </div>
      <Legend items={legend} />
    </GlassCard>
  )
}
