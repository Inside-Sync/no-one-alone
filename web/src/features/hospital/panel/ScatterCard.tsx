import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { HospitalData } from '@/data/types'
import { Head } from '../../individual/home/parts'

const W = 320, H = 240, L = 30, B = 210, T = 10
const x = (a: number) => L + ((a - 70) / 25) * (W - L - 6)
const y = (r: number) => B - (r / 40) * (B - T)
const colour = (r: number) => (r >= 20 ? '#d9443f' : r >= 10 ? '#c88a05' : '#1fb39c')

/** `#scatter` (prototype lines 1712–1717): 30-day admission risk against age, one dot per sampled patient. */
function Scatter({ points, mark }: { points: HospitalData['panel']['scatter']; mark: HospitalData['panel']['highlight'] }) {
  const { t } = useTranslation('hospital')
  return (
    <svg viewBox={`0 0 ${W} ${H + 10}`} role="img" aria-label={t('panel.scatter.ariaLabel')}>
      {[0, 10, 20, 30, 40].map((t) => (
        <g key={t}>
          <line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke="rgba(13,42,42,.08)" />
          <text x={L - 5} y={y(t) + 3} textAnchor="end">{t}%</text>
        </g>
      ))}
      {[70, 75, 80, 85, 90, 95].map((a) => (
        <text key={a} x={x(a)} y={B + 14} textAnchor="middle">{a}</text>
      ))}
      {points.map((p, i) => (
        <circle key={i} cx={x(p.age).toFixed(1)} cy={y(p.risk).toFixed(1)} r="3.2" fill={colour(p.risk)} opacity=".7" />
      ))}
      <circle cx={x(mark.age)} cy={y(mark.risk)} r="6" fill="none" strokeWidth="1.6" style={{ stroke: 'var(--ink)' }} />
      <text x={x(mark.age) + 9} y={y(mark.risk) - 6} style={{ fill: 'var(--ink)', fontSize: '10.5px' }}>{mark.label}</text>
      <text x={(L + W) / 2} y={B + 28} textAnchor="middle">{t('panel.scatter.axis')}</text>
    </svg>
  )
}

/** `Risk vs age` (c4): the scatter, its legend and the consent note. */
export function ScatterCard({ panel }: { panel: HospitalData['panel'] }) {
  const { t } = useTranslation('hospital')
  const legend = t('panel.scatter.legend', { returnObjects: true })
  return (
    <GlassCard span={4} className="chart">
      <Head title={t('panel.scatter.title')} meta={panel.scatterMeta} />
      <div id="scatter"><Scatter points={panel.scatter} mark={panel.highlight} /></div>
      <div className="legend">
        {legend.map((l) => <span key={l.label}><i style={{ background: l.color, borderRadius: '50%' }}></i>{l.label}</span>)}
      </div>
      <p className="fine">{panel.scatterNote}</p>
    </GlassCard>
  )
}
