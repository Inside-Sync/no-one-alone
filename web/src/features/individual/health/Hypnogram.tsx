import type { HealthData } from '@/data/types'

/** Stage colours, awake to deep; the card legend uses the same list. */
export const STAGE_COLOURS = ['#ef9a8a', '#8fb8f0', '#4a7fd8', '#26408f'] as const

const W = 640, Lx = 56

/** `#hypno`: sleep-stage hypnogram (prototype lines 1632–1638). */
export function Hypnogram({ hypnogram: h, ariaLabel }: { hypnogram: HealthData['hypnogram']; ariaLabel: string }) {
  const total = h.segments.reduce((a, q) => a + q.minutes, 0)
  const starts = h.segments.map((_, i) => h.segments.slice(0, i).reduce((a, q) => a + q.minutes, 0))
  return (
    <svg viewBox={`0 0 ${W} 146`} role="img" aria-label={ariaLabel}>
      {h.stageNames.map((n, i) => (
        <g key={n}>
          <text x="0" y={20 + i * 30 + 4} style={{ fontFamily: 'var(--font)', fontSize: 11, fill: 'var(--ink2)' }}>{n}</text>
          <line x1={Lx} x2={W} y1={20 + i * 30} y2={20 + i * 30} stroke="rgba(13,42,42,.06)" />
        </g>
      ))}
      {h.segments.map((q, i) => {
        const x0 = Lx + (starts[i] / total) * (W - Lx)
        const w = (q.minutes / total) * (W - Lx)
        return <rect key={i} x={x0.toFixed(1)} y={12 + q.stage * 30} width={Math.max(1.5, w - 1).toFixed(1)} height="16" rx="4" fill={STAGE_COLOURS[q.stage]} />
      })}
      {h.axisLabels.map((a, i) => (
        <text key={a.text} x={Lx + a.at * (W - Lx)} y="140" textAnchor={i === h.axisLabels.length - 1 ? 'end' : 'middle'}>{a.text}</text>
      ))}
    </svg>
  )
}
