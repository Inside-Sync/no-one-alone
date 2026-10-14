import { GlassCard } from '@/components/ui/GlassCard'
import { HOSPITAL_COPY } from '@/data/repo'
import type { ShapDriver } from '@/data/types'
import { Head } from '../../individual/home/parts'

/** `What drives Thursday's spike` (c6): signed contribution bars around a centre line; widths scale to the largest driver. */
export function DriversCard({ drivers }: { drivers: ShapDriver[] }) {
  const c = HOSPITAL_COPY.demand.shap
  const max = Math.max(...drivers.map((d) => Math.abs(d.value)))
  return (
    <GlassCard span={6}>
      <Head title={c.title} meta={c.meta} />
      <div className="shap" id="demandShap">
        {drivers.map((d) => {
          const up = d.value > 0
          const barStyle = { [up ? 'left' : 'right']: '50%', background: up ? '#d9443f' : '#1fb39c', width: `${(Math.abs(d.value) / max) * 50}%` }
          return (
            <div key={d.label}>
              <span>{d.label}</span>
              <span className="b"><i style={barStyle}></i></span>
              <b style={{ color: up ? 'var(--bad)' : 'var(--good)' }}>{up ? '+' : '−'}{Math.abs(d.value).toFixed(1)}</b>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
