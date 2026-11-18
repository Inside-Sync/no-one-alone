import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Suppressed, SuppressionNote } from '@/components/ui/Suppressed'
import { suppressSplit } from '@/domain/suppression'
import type { SignalsData } from '@/data/government.types'

/** Chart frame: viewBox width, plot left/top/bottom and the y-axis maximum. */
const W = 420, L = 30, B = 170, T = 10, VIEW_H = 190
const Y_MAX = 80
const GRID = [0, 20, 40, 60, 80]
const BAR_GAP = 12
const BAR_INSET = 6
const LABEL_DROP = 14
const TOTAL_LIFT = 5
/** Not reached, waiting for a slot, declined or no owner. */
const REASON_COLOURS = ['#d9443f', '#c88a05', '#2f6fb0'] as const
const BAR_ROUNDING = 3

/** `Results passing their target each week` (c5): eight weekly stacks by reason, the first and the latest labelled with their total. */
export function WeeklyCard({ weeks, labels }: { weeks: SignalsData['weekly']; labels: SignalsData['weeklyLabels'] }) {
  const { t } = useTranslation('government')
  const { t: tc } = useTranslation()
  const names = [labels.notReached, labels.waiting, labels.declined]
  const bw = (W - L) / weeks.length
  const anyHidden = weeks.some((w) => suppressSplit(w).includes(null))
  return (
    <GlassCard span={5} className="chart">
      <div className="ch"><h2>{t('signals.weekly.title')}</h2><span className="meta">{t('signals.weekly.meta')}</span></div>
      <div id="weekly">
        <svg viewBox={`0 0 ${W} ${VIEW_H}`} role="img" aria-label={t('signals.weekly.ariaLabel')}>
          <defs>
            <pattern id="suppressedHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#eef2f1" /><line x1="0" y1="0" x2="0" y2="6" stroke="#8a9a98" strokeWidth="2" />
            </pattern>
          </defs>
          {GRID.map((g) => {
            const y = B - (g / Y_MAX) * (B - T)
            return (
              <g key={g}>
                <line x1={L} x2={W} y1={y} y2={y} stroke="rgba(13,42,42,.08)" />
                <text x={L - 5} y={y + 3} textAnchor="end">{g}</text>
              </g>
            )
          })}
          {weeks.map((w, i) => {
            const x0 = L + i * bw + BAR_INSET
            const width = bw - BAR_GAP
            const last = i === weeks.length - 1
            let y = B
            // Each stack shows its total, so a cell under 10 would be recoverable: the split is suppressed with its complement.
            const cells = suppressSplit(w)
            const bars = w.map((v, j) => {
              if (cells[j] === null) return null
              const h = (v / Y_MAX) * (B - T)
              y -= h
              return <rect key={j} x={x0} y={y} width={width} height={h} fill={REASON_COLOURS[j]} rx={j === 2 ? BAR_ROUNDING : undefined} />
            })
            // Hidden cells are one hatched block on top: its height is only their sum, never one of them.
            const hiddenSum = w.reduce((a, v, j) => a + (cells[j] === null ? v : 0), 0)
            const hatch = hiddenSum > 0 && (() => {
              const h = (hiddenSum / Y_MAX) * (B - T)
              y -= h
              return <rect x={x0} y={y} width={width} height={h} fill="url(#suppressedHatch)" stroke="#8a9a98" strokeWidth={0.8} rx={BAR_ROUNDING}><title>{tc('suppression.label')}</title></rect>
            })()
            return (
              <g key={i}>
                {bars}
                {hatch}
                <text x={x0 + width / 2} y={B + LABEL_DROP} textAnchor="middle">{last ? t('signals.weekly.thisWeek') : t('signals.weekly.weeksAgo', { n: weeks.length - 1 - i })}</text>
                {(last || i === 0) && <text x={x0 + width / 2} y={y - TOTAL_LIFT} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: '11px' }}>{w.reduce((a, b) => a + b, 0)}</text>}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="legend">
        {names.map((n, j) => <span key={n}><i style={{ background: REASON_COLOURS[j] }}></i>{n}</span>)}
        {anyHidden && <span><i style={{ background: 'repeating-linear-gradient(45deg,#eef2f1 0 2px,#8a9a98 2px 4px)' }}></i><Suppressed /></span>}
      </div>
      {anyHidden && <SuppressionNote />}
    </GlassCard>
  )
}
