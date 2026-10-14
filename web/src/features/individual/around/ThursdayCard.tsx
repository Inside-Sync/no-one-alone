'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { AROUND_COPY } from '@/data/repo'
import type { Surroundings } from '@/data/types'
import { Head } from '../home/parts'
import { Legend } from '../health/Legend'

const W = 640, L = 36, B = 150, T = 12
const y = (v: number) => B - ((v - 20) / 20) * (B - T)
const f1 = (n: number) => n.toFixed(1)

/** `#thu`: outdoor (solid) and indoor (dashed) temperature, the cool-room window and the helper's check-ins (prototype lines 1687–1694). */
function ThursdayChart({ t }: { t: Surroundings['thursday'] }) {
  const n = t.outdoor.length
  const x = (i: number) => L + (i * (W - L)) / (n - 1)
  const lines = [[t.outdoor, '#e07a3f'], [t.indoor, '#d9443f']] as const
  return (
    <svg viewBox="0 0 640 172" role="img" aria-label={AROUND_COPY.thursday.ariaLabel}>
      {[20, 25, 30, 35, 40].map((v) => (
        <g key={v}>
          <line x1={L} x2={W} y1={y(v)} y2={y(v)} stroke="rgba(13,42,42,.08)" />
          <text x={L - 6} y={y(v) + 3} textAnchor="end">{v}°</text>
        </g>
      ))}
      <rect x={x(t.coolRoom.from)} y={T} width={x(t.coolRoom.to) - x(t.coolRoom.from)} height={B - T} fill="rgba(143,111,208,.16)" />
      <text x={(x(t.coolRoom.from) + x(t.coolRoom.to)) / 2} y={T + 12} textAnchor="middle" style={{ fill: '#6d4fc0' }}>{t.coolRoom.label}</text>
      {t.plan.map((a) => (
        <g key={a.at}>
          <line x1={x(a.at)} x2={x(a.at)} y1={B - 4} y2={B + 2} stroke="#6d4fc0" strokeWidth="2" />
          <text x={x(a.at)} y={B - 8} textAnchor="middle" style={{ fill: '#6d4fc0' }}>{a.label}</text>
        </g>
      ))}
      {lines.map(([vals, colour], qi) => (
        <path
          key={colour}
          d={vals.map((v, i) => `${i ? 'L' : 'M'}${f1(x(i))} ${f1(y(v))}`).join(' ')}
          fill="none"
          stroke={colour}
          strokeWidth="2.4"
          strokeDasharray={qi ? '5 4' : undefined}
        />
      ))}
      {Array.from({ length: Math.ceil(n / 2) }, (_, k) => k * 2).map((i) => (
        <text key={i} x={x(i)} y={B + 16} textAnchor="middle">{String(6 + i).padStart(2, '0')}:00</text>
      ))}
    </svg>
  )
}

/** `🔥 Thursday, hour by hour` (c6). */
export function ThursdayCard({ thursday }: { thursday: Surroundings['thursday'] }) {
  const c = AROUND_COPY.thursday
  return (
    <GlassCard span={6} className="chart">
      <Head title={c.title} meta={c.meta} />
      <div id="thu"><ThursdayChart t={thursday} /></div>
      <Legend items={thursday.legend} />
    </GlassCard>
  )
}
