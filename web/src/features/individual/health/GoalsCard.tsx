'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { GoalGauge, HealthData } from '@/data/types'
import { Head, MiniGrid } from '../home/parts'

const ARC = 'M12 62 A48 48 0 0 1 108 62'
const LEN = Math.PI * 48

/** One half-ring gauge (`#gauges`): value over goal. */
function Gauge({ g }: { g: GoalGauge }) {
  const { t } = useTranslation('health')
  const f = g.value / g.goal
  return (
    <div>
      <svg viewBox="0 0 120 72" aria-hidden="true">
        <path d={ARC} fill="none" stroke="var(--track)" strokeWidth="11" strokeLinecap="round" />
        <path d={ARC} fill="none" stroke={g.color} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(LEN * f).toFixed(1)} ${LEN.toFixed(1)}`} />
        <text x="60" y="58" textAnchor="middle" style={{ fontSize: 20, fill: 'var(--ink)', fontFamily: 'var(--font)', fontWeight: 300 }}>{g.value}</text>
      </svg>
      <b>{g.label}</b>
      <small>{t('goals.of', { goal: g.goal, unit: g.unit })}</small>
    </div>
  )
}

/** `Today's goals` (c4): three gauges and the day's totals. Not tagged with a consent category. */
export function GoalsCard({ health }: { health: HealthData }) {
  const { t } = useTranslation('health')
  return (
    <GlassCard span={4}>
      <Head icon="target" title={t('goals.title')} meta={t('goals.meta')} />
      <div className="gauges">{health.goals.map((g) => <Gauge key={g.label} g={g} />)}</div>
      <MiniGrid stats={health.goalTotals} />
    </GlassCard>
  )
}
