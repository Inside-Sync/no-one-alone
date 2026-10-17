'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Locked } from '@/components/ui/Locked'
import { Head } from '../home/parts'

const W = 640, L = 40, B = 120
const y = (v: number) => B - (v / 5000) * (B - 10)

/** `#steps14`: 14 day bars, goal reached in teal, with the dashed goal line (prototype lines 1647–1652). */
function StepsChart({ steps, goal }: { steps: number[]; goal: number }) {
  const { t } = useTranslation('health')
  const bw = (W - L) / steps.length
  const n = steps.length
  return (
    <svg viewBox="0 0 640 140" role="img" aria-label={t('steps.ariaLabel')}>
      {[0, 2500, 5000].map((t) => <text key={t} x={L - 6} y={y(t) + 3} textAnchor="end">{t / 1000}k</text>)}
      {steps.map((v, i) => (
        <g key={i}>
          <rect x={L + i * bw + 4} y={y(v)} width={bw - 8} height={B - y(v)} rx="5" fill={v >= goal ? '#1fb39c' : '#8fd3c3'} />
          <text x={L + i * bw + bw / 2} y={B + 14} textAnchor="middle">{i === n - 1 ? t('days.today') : t('days.ago', { n: n - i })}</text>
        </g>
      ))}
      <line x1={L} x2={W} y1={y(goal)} y2={y(goal)} stroke="#0b7f71" strokeDasharray="4 3" />
      <text x={W} y={y(goal) - 4} textAnchor="end" style={{ fill: 'var(--teal-text)' }}>{t('steps.goal')}</text>
    </svg>
  )
}

/** `Steps, last 2 weeks` (c6, activity category). */
export function StepsCard({ steps, goal }: { steps: number[]; goal: number }) {
  const { t } = useTranslation('health')
  return (
    <Locked cat="activity" span={6}>
      <GlassCard span={6} className="chart">
        <Head icon="footprints" title={t('steps.title')} meta={t('steps.meta')} />
        <div id="steps14"><StepsChart steps={steps} goal={goal} /></div>
      </GlassCard>
    </Locked>
  )
}
