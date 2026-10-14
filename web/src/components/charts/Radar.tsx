interface Axis {
  label: string
  /** 0..100 now. */
  value: number
  /** 0..100 last month / usual (dashed outline). */
  usual: number
}

interface Props {
  axes: Axis[]
  /** Big number in the middle (overall score). */
  score?: number
  ariaLabel?: string
}

const CX = 120, CY = 112, R = 86

/** Prototype radar (line 1421): 240×226 svg, rings at 25/50/75/100. */
export function Radar({ axes, score, ariaLabel }: Props) {
  const n = axes.length
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2
    return [CX + ((R * v) / 100) * Math.cos(a), CY + ((R * v) / 100) * Math.sin(a)]
  }
  const label =
    ariaLabel ??
    (score != null ? `Overall ${score} out of 100: ` : '') + axes.map((a) => `${a.label} ${a.value}`).join(', ')
  return (
    <svg viewBox="0 0 240 226" role="img" aria-label={label}>
      {[25, 50, 75, 100].map((g) => (
        <polygon key={g} points={axes.map((_, i) => pt(i, g).join(',')).join(' ')} fill="none" stroke="rgba(13,42,42,.10)" />
      ))}
      {axes.map((a, i) => {
        const p = pt(i, 100), l = pt(i, 118)
        return [
          <line key={'a' + i} x1={CX} y1={CY} x2={p[0]} y2={p[1]} stroke="rgba(13,42,42,.08)" />,
          <text key={'t' + i} x={l[0]} y={l[1] + 3} textAnchor="middle" style={{ fontFamily: 'var(--font)', fontSize: '10px', fill: 'var(--ink2)' }}>{a.label}</text>,
        ]
      })}
      <polygon points={axes.map((a, i) => pt(i, a.usual).join(',')).join(' ')} fill="none" stroke="#8f6fd0" strokeDasharray="4 3" strokeWidth="1.4" />
      <polygon points={axes.map((a, i) => pt(i, a.value).join(',')).join(' ')} fill="rgba(31,179,156,.22)" stroke="#0b7f71" strokeWidth="2" />
      {axes.map((a, i) => {
        const p = pt(i, a.value)
        return <circle key={'c' + i} cx={p[0]} cy={p[1]} r="3" fill="#0b7f71" />
      })}
      {score != null && (
        <text x={CX} y={CY + 6} textAnchor="middle" style={{ fontSize: '22px', fill: 'var(--ink)', fontWeight: 500 }}>{score}</text>
      )}
    </svg>
  )
}
