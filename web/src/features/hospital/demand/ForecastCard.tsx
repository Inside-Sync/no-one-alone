import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { HospitalData } from '@/data/types'

type Demand = HospitalData['demand']

const W = 700, L = 36, B = 190, T = 12
const y = (v: number) => B - ((v - 10) / 30) * (B - T)
const x = (i: number) => L + (i * (W - L - 10)) / 13
const RED = '#d9443f'

/** `#demand14` (prototype lines 1719–1726): 14-day forecast with its 80% interval, last year and the comfort line. */
function DemandChart({ d }: { d: Demand }) {
  const { t } = useTranslation('hospital')
  const f = d.forecast
  const up = f.map((v, i) => `${x(i).toFixed(1)} ${y(v + 3 + i * 0.35).toFixed(1)}`)
  const dn = f.map((v, i) => `${x(i).toFixed(1)} ${y(v - 3 - i * 0.35).toFixed(1)}`).reverse()
  const line = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} 210`} role="img" aria-label={t('demand.forecast.ariaLabel')}>
      {[10, 20, d.comfortLine, 30, 40].map((t) => {
        const comfort = t === d.comfortLine
        return (
          <g key={t}>
            <line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke={comfort ? RED : 'rgba(13,42,42,.08)'} strokeDasharray={comfort ? '5 4' : undefined} />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" style={comfort ? { fill: RED } : undefined}>{t}</text>
          </g>
        )
      })}
      <path d={`M${up.join(' L')} L${dn.join(' L')}Z`} fill="rgba(47,111,176,.15)" />
      <path d={line(d.lastYear)} fill="none" stroke="#56706e" strokeWidth="1.6" strokeDasharray="3 3" />
      <path d={line(f)} fill="none" stroke="#2f6fb0" strokeWidth="2.6" />
      {f.map((v, i) => {
        const hot = v > d.comfortLine
        return (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r={hot ? 5 : 3} fill={hot ? RED : '#2f6fb0'} />
            <text x={x(i)} y={B + 15} textAnchor="middle">{d.days[i]}</text>
            {hot && <text x={x(i)} y={y(v) - 9} textAnchor="middle" style={{ fill: RED, fontSize: '11px' }}>{v}</text>}
          </g>
        )
      })}
      <text x={x(1)} y={T + 6} textAnchor="middle" style={{ fill: RED }}>{t('demand.forecast.heatwave')}</text>
      <text x={x(13)} y={T + 6} textAnchor="end" style={{ fill: '#c88a05' }}>{t('demand.forecast.secondSpell')}</text>
    </svg>
  )
}

/** `Presentations aged 75+, next 14 days` (c8), tagged FORECAST. */
export function ForecastCard({ demand }: { demand: Demand }) {
  const { t } = useTranslation('hospital')
  const legend = t('demand.forecast.legend', { returnObjects: true })
  return (
    <GlassCard span={8} className="chart">
      <div className="ch"><h2>{t('demand.forecast.title')}</h2><span className="tag">{t('demand.forecast.tag')}</span><span className="meta">{demand.meta}</span></div>
      <div id="demand14"><DemandChart d={demand} /></div>
      <div className="legend">
        {legend.map((l) => <span key={l.label}><i style={{ background: l.color }}></i>{l.label}</span>)}
      </div>
    </GlassCard>
  )
}
