import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { WatchData } from '@/data/types'

/** Chart frame (`scams` IIFE, prototype line 1737): viewBox width, plot left/top/bottom and the y-axis maximum. */
const W = 420, L = 30, B = 170, T = 10, VIEW_H = 190
const Y_MAX = 40
const GRID = [0, 10, 20, 30, 40]
const BAR_GAP = 12
const BAR_INSET = 6
const LABEL_DROP = 14
const TOTAL_LIFT = 5
const WEEK_COLOURS = ['#8f6fd0', '#c88a05', '#2f6fb0'] as const
const BAR_ROUNDING = 3

/** `Scam contacts reported by residents` (c5): eight weekly stacks, the latest labelled with its total. */
export function ScamsCard({ weeks, labels }: { weeks: WatchData['scams']; labels: WatchData['scamLabels'] }) {
  const { t } = useTranslation('community')
  const names = [labels.phone, labels.door, labels.text]
  const bw = (W - L) / weeks.length
  return (
    <GlassCard span={5} className="chart">
      <div className="ch"><h2>{t('watch.scams.title')}</h2><span className="meta">{t('watch.scams.meta')}</span></div>
      <div id="scams">
        <svg viewBox={`0 0 ${W} ${VIEW_H}`} role="img" aria-label={t('watch.scams.ariaLabel')}>
          {GRID.map((t) => {
            const y = B - (t / Y_MAX) * (B - T)
            return (
              <g key={t}>
                <line x1={L} x2={W} y1={y} y2={y} stroke="rgba(13,42,42,.08)" />
                <text x={L - 5} y={y + 3} textAnchor="end">{t}</text>
              </g>
            )
          })}
          {weeks.map((w, i) => {
            const x0 = L + i * bw + BAR_INSET
            const width = bw - BAR_GAP
            const last = i === weeks.length - 1
            let y = B
            const bars = w.map((v, j) => {
              const h = (v / Y_MAX) * (B - T)
              y -= h
              return <rect key={j} x={x0} y={y} width={width} height={h} fill={WEEK_COLOURS[j]} rx={j === 2 ? BAR_ROUNDING : undefined} />
            })
            return (
              <g key={i}>
                {bars}
                <text x={x0 + width / 2} y={B + LABEL_DROP} textAnchor="middle">{last ? t('watch.scams.thisWeek') : t('watch.scams.weeksAgo', { n: weeks.length - 1 - i })}</text>
                {last && <text x={x0 + width / 2} y={y - TOTAL_LIFT} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: '11px' }}>{w.reduce((a, b) => a + b, 0)}</text>}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="legend">
        {names.map((n, j) => <span key={n}><i style={{ background: WEEK_COLOURS[j] }}></i>{n}</span>)}
      </div>
    </GlassCard>
  )
}
