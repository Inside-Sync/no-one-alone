import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { GovernmentData } from '@/data/government.types'
import { Head } from '../../individual/home/parts'
import { BAND_COLOUR, capacityBand, OVER_CAPACITY, UNDER_CAPACITY } from '../bands'
import s from '../government.module.css'

/** Chart frame: viewBox size and plot margins; capacity runs 55..110 % across, effectiveness 55..90 up. */
const W = 780, H = 330, L = 44, R = 16, T = 14, B = 40
const X_MIN = 55, X_MAX = 110, Y_MIN = 55, Y_MAX = 90
const X_TICKS = [60, 70, 80, 90, 100, 110]
const Y_TICKS = [60, 70, 80, 90]
const HOSPITAL_R = 7, CENTRE_R = 5.5
/** Dots at or beyond this capacity carry their name on their left, so it stays on the plate. */
const LABEL_LEFT_FROM = 96

const x = (v: number) => L + ((v - X_MIN) / (X_MAX - X_MIN)) * (W - L - R)
const y = (v: number) => T + ((Y_MAX - v) / (Y_MAX - Y_MIN)) * (H - T - B)

/** `Capacity and effectiveness by facility` (c7): each facility's capacity in use against its effectiveness score. */
export function ScatterCard({ facilities }: { facilities: GovernmentData['facilities'] }) {
  const { t } = useTranslation('government')
  const bands = t('population.scatter.bands', { returnObjects: true })
  return (
    <GlassCard span={7} id="capScatter">
      <Head icon="target" title={t('population.scatter.title')} meta={t('population.scatter.meta')} />
      <div className={s.scat}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('population.scatter.ariaLabel')}>
          <rect x={x(X_MIN)} y={T} width={x(UNDER_CAPACITY) - x(X_MIN)} height={H - T - B} fill="rgba(90,127,224,.10)" />
          <rect x={x(UNDER_CAPACITY)} y={T} width={x(OVER_CAPACITY) - x(UNDER_CAPACITY)} height={H - T - B} fill="rgba(31,157,87,.10)" />
          <rect x={x(OVER_CAPACITY)} y={T} width={x(X_MAX) - x(OVER_CAPACITY)} height={H - T - B} fill="rgba(217,68,63,.10)" />
          <line x1={L} x2={W - R} y1={y(facilities.average)} y2={y(facilities.average)} stroke="currentColor" strokeOpacity=".35" strokeDasharray="4 4" />
          <text x={L + 6} y={y(facilities.average) + 14} textAnchor="start">{t('population.scatter.average', { value: facilities.average })}</text>
          {X_TICKS.map((v) => <text key={v} x={x(v)} y={H - B + 16} textAnchor="middle">{v}%</text>)}
          {Y_TICKS.map((v) => <text key={v} x={L - 6} y={y(v) + 4} textAnchor="end">{v}</text>)}
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle">{t('population.scatter.axis')}</text>
          <text x={x((X_MIN + UNDER_CAPACITY) / 2)} y={T + 14} textAnchor="middle">{bands.under}</text>
          <text x={x((UNDER_CAPACITY + OVER_CAPACITY) / 2)} y={T + 14} textAnchor="middle">{bands.right}</text>
          <text x={x((OVER_CAPACITY + X_MAX) / 2)} y={T + 14} textAnchor="middle">{bands.over}</text>
          {facilities.rows.map((f) => {
            const left = f.capacity >= LABEL_LEFT_FROM
            return (
              <g key={f.name}>
                <circle cx={x(f.capacity)} cy={y(f.effectiveness)} r={f.kind === 'hosp' ? HOSPITAL_R : CENTRE_R} fill={BAND_COLOUR[capacityBand(f.capacity)]} stroke="#fff" strokeWidth="1.5" />
                <text x={x(f.capacity) + (left ? -9 : 9)} y={y(f.effectiveness) + (left ? -6 : 4)} textAnchor={left ? 'end' : 'start'}>{f.shortName}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <p className="fine">{facilities.note}</p>
    </GlassCard>
  )
}
