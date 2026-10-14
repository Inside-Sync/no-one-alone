import type { Hr24 } from '@/data/types'

const W = 700, Hh = 190, L = 34, T = 10, B = 160
const y = (v: number) => B - ((v - 45) / (125 - 45)) * (B - T)
const x = (i: number) => L + (i / 288) * (W - L)
const f1 = (n: number) => n.toFixed(1)

/** `#hr24`: 24 h heart rate line with min-max band, asleep shading, alert dots and the walk peak (prototype lines 1609–1619). */
export function Hr24Chart({ hr, ariaLabel, asleepLabel }: { hr: Hr24; ariaLabel: string; asleepLabel: string }) {
  const up = hr.band.hi.map((v, i) => `${f1(x(i))} ${f1(y(v))}`)
  const dn = hr.band.lo.map((v, i) => `${f1(x(i))} ${f1(y(v))}`).reverse()
  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} role="img" aria-label={ariaLabel}>
      {[60, 80, 100, 120].map((t) => (
        <g key={t}>
          <line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke="rgba(13,42,42,.08)" />
          <text x={L - 6} y={y(t) + 3} textAnchor="end">{t}</text>
        </g>
      ))}
      <rect x={x(hr.asleepFrom)} y={T} width={x(hr.asleepTo) - x(hr.asleepFrom)} height={B - T} fill="rgba(90,127,224,.07)" />
      <text x={x(hr.asleepFrom) + 4} y={T + 10}>{asleepLabel}</text>
      <path d={`M${up.join(' L')} L${dn.join(' L')}Z`} fill="rgba(239,106,94,.12)" />
      <path d={hr.points.map((v, i) => `${i ? 'L' : 'M'}${f1(x(i))} ${f1(y(v))}`).join(' ')} fill="none" stroke="#ef6a5e" strokeWidth="1.6" />
      {hr.alerts.map((a) => (
        <g key={a.index}>
          <circle cx={x(a.index)} cy={y(hr.points[a.index]) - 12} r="5" fill="#c2417a" />
          <text x={x(a.index)} y={y(hr.points[a.index]) - 20} textAnchor="middle" style={{ fill: '#c2417a' }}>{a.label}</text>
        </g>
      ))}
      <circle cx={x(hr.walk.index)} cy={y(hr.walk.value)} r="5" fill="#1fb39c" />
      <text x={x(hr.walk.index)} y={y(hr.walk.value) - 9} textAnchor="middle" style={{ fill: '#0b7f71' }}>{hr.walk.label}</text>
      {hr.axisLabels.map((t, i) => (
        <text key={i} x={x(i * 36)} y={B + 16} textAnchor="middle">{t}</text>
      ))}
    </svg>
  )
}
