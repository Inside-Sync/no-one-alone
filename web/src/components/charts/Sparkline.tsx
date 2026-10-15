import { useTranslation } from 'react-i18next'

interface Props {
  values: number[]
  color: string
  /** Summary for screen readers; defaults to "Trend from first to last". */
  ariaLabel?: string
  /** Hide from assistive tech, as the prototype does inside a KPI tile whose text already says it. */
  decorative?: boolean
}

/** Prototype `spark()` (line 1168): 100×26 area + line + end dot. */
export function Sparkline({ values, color, ariaLabel, decorative }: Props) {
  const { t } = useTranslation()
  const w = 100, h = 26
  const mn = Math.min(...values), mx = Math.max(...values), r = mx - mn || 1
  const pts = values.map((x, i) => [(i / (values.length - 1)) * w, h - 3 - ((x - mn) / r) * (h - 6)])
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const l = pts[pts.length - 1]
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': ariaLabel ?? t('charts.sparkline', { from: values[0], to: values[values.length - 1] }) }
  return (
    <svg viewBox="0 0 100 26" preserveAspectRatio="none" {...a11y}>
      <path d={d + ' L100 26 L0 26Z'} fill={color} opacity=".12" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <circle cx={l[0]} cy={l[1]} r="2.4" fill={color} />
    </svg>
  )
}
