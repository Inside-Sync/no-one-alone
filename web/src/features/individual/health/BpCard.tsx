'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Locked } from '@/components/ui/Locked'
import type { HealthData } from '@/data/types'
import { Head } from '../home/parts'
import { Legend } from './Legend'

const W = 640, L = 40, B = 120
const y = (v: number) => B - ((v - 120) / 30) * (B - 10)
const f1 = (n: number) => n.toFixed(1)

/** `#bp14`: morning and evening systolic lines over a "target under 135" band (prototype lines 1653–1659). */
function BpChart({ bp }: { bp: HealthData['bp14'] }) {
  const x = (i: number) => L + (i * (W - L)) / (bp.morning.length - 1)
  const series = [[bp.morning, '#c88a05'], [bp.evening, '#5a7fe0']] as const
  const last = bp.morning[bp.morning.length - 1]
  const { t } = useTranslation('health')
  return (
    <svg viewBox="0 0 640 134" role="img" aria-label={t('bp.ariaLabel')}>
      {[125, 135, 145].map((t) => (
        <g key={t}>
          <line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke="rgba(13,42,42,.08)" />
          <text x={L - 6} y={y(t) + 3} textAnchor="end">{t}</text>
        </g>
      ))}
      <rect x={L} y={y(bp.target)} width={W - L} height={B - y(bp.target)} fill="rgba(31,179,156,.12)" />
      {series.map(([vals, colour]) => (
        <g key={colour}>
          <path d={vals.map((v, i) => `${i ? 'L' : 'M'}${f1(x(i))} ${f1(y(v))}`).join(' ')} fill="none" stroke={colour} strokeWidth="2.2" />
          {vals.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.6" fill={colour} />)}
        </g>
      ))}
      <text x={W - 2} y={y(last) - 7} textAnchor="end" style={{ fill: '#c88a05', fontSize: 11 }}>{last}</text>
    </svg>
  )
}

/** `Blood pressure, last 2 weeks` (c6, heart category). */
export function BpCard({ bp }: { bp: HealthData['bp14'] }) {
  const { t } = useTranslation('health')
  return (
    <Locked cat="heart" span={6}>
      <GlassCard span={6} className="chart">
        <Head icon="stethoscope" title={t('bp.title')} meta={t('bp.meta')} />
        <div id="bp14"><BpChart bp={bp} /></div>
        <Legend items={t('bp.legend', { returnObjects: true })} />
      </GlassCard>
    </Locked>
  )
}
