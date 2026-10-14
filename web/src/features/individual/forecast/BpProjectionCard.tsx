import { LineChart } from '@/components/charts/LineChart'
import { GlassCard } from '@/components/ui/GlassCard'
import { FORECAST_COPY } from '@/data/repo'
import type { Forecast } from '@/data/types'
import { bpProjection } from '@/domain/riskSim'
import { Head } from '../home/parts'
import { Legend } from '../health/Legend'

/** `Morning systolic blood pressure` (c7): observed 6 weeks, three projections, target band (`bpChart`, line 1449). */
export function BpProjectionCard({ bp, adherence }: { bp: Forecast['bp']; adherence: number }) {
  const c = FORECAST_COPY.bp
  const { projected } = bpProjection(adherence)
  const showWhatIf = adherence !== 86 && adherence !== 100
  const start = bp.todayWeek - 1
  return (
    <GlassCard span={7} className="chart">
      <Head title={c.title} meta={c.meta} />
      <div id="bpChart">
        <LineChart
          yLabel={c.yLabel}
          ariaLabel={c.ariaLabel}
          viewBox={[580, 214]}
          plot={{ left: 44, right: 548, top: 10, bottom: 196 }}
          x={{ count: bp.weeks, labels: Array.from({ length: bp.weeks }, (_, i) => ({ at: i, text: c.weekLabel(i + 1) })) }}
          y={{ min: bp.lo, max: bp.hi, ticks: [125, 135, 145, 155, 165] }}
          targetBand={{ from: bp.lo, to: bp.target, color: 'rgba(31,179,156,.10)' }}
          marker={{ at: start, label: c.today }}
          bands={[
            { values: bp.projectedNothing, spread: 2.2, color: 'rgba(217,68,63,.12)', start },
            { values: bp.projectedAdherent, spread: 2.2, color: 'rgba(31,179,156,.16)', start },
          ]}
          series={[
            { name: 'Projected if nothing changes', values: bp.projectedNothing, color: '#d9443f', dashed: true, start, endLabel: true },
            { name: 'Projected at 100% adherence', values: bp.projectedAdherent, color: '#1fb39c', dashed: true, start, endLabel: '#0b7f71' },
            ...(showWhatIf ? [{ name: 'Your what-if scenario', values: projected, color: '#8f6fd0', start, endLabel: true }] : []),
            { name: 'Observed', values: bp.observed, color: '#c88a05', area: 'rgba(200,138,5,.12)', dots: { r: 3.2, lastR: 5.5, hollow: true } },
          ]}
        />
      </div>
      <Legend items={c.legend} />
    </GlassCard>
  )
}
