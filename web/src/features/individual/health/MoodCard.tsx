'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Locked } from '@/components/ui/Locked'
import { Pill } from '@/components/ui/Pill'
import { HEALTH_COPY } from '@/data/repo'
import type { HealthData } from '@/data/types'
import { Head } from '../home/parts'

const W = 640, L = 70, MID = 70
const label = { fontFamily: 'var(--font)', fontSize: 11, fill: 'var(--ink2)' }

/** `#mood`: 14 pleasant/unpleasant bars with "hot" and "walk" marks (prototype lines 1639–1646). */
function MoodChart({ mood }: { mood: HealthData['mood14'] }) {
  const c = HEALTH_COPY.mood
  const n = mood.values.length
  const bw = (W - L) / n
  return (
    <svg viewBox={`0 0 ${W} 146`} role="img" aria-label={c.ariaLabel}>
      <line x1={L} x2={W} y1={MID} y2={MID} stroke="rgba(13,42,42,.2)" />
      <text x="0" y="24" style={label}>{c.top}</text>
      <text x="0" y="124" style={label}>{c.bottom}</text>
      {mood.values.map((v, i) => {
        const x0 = L + i * bw + 4
        const h = Math.abs(v) * 55
        const cx = x0 + (bw - 8) / 2
        return (
          <g key={i}>
            <rect x={x0} y={v >= 0 ? MID - h : MID} width={bw - 8} height={Math.max(2, h)} rx="5" fill={v >= 0 ? '#1fb39c' : '#c88a05'} />
            {mood.hotDays.includes(i) && <text x={cx} y={MID + h + 12} textAnchor="middle" style={{ fill: '#d9443f' }}>{c.hot}</text>}
            {mood.walkDays.includes(i) && <text x={cx} y={MID - h - 5} textAnchor="middle" style={{ fill: 'var(--teal-text)' }}>{c.walk}</text>}
            <text x={cx} y="140" textAnchor="middle">{i === n - 1 ? 'today' : `${n - i}d`}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** `😊 Mood, last 2 weeks` (c6, mood category). */
export function MoodCard({ mood }: { mood: HealthData['mood14'] }) {
  const c = HEALTH_COPY.mood
  return (
    <Locked cat="mood" span={6}>
      <GlassCard span={6} className="chart">
        <Head title={c.title} meta={c.meta} />
        <div id="mood"><MoodChart mood={mood} /></div>
        <div className="tags" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {mood.tags.map((t) => <Pill key={t.text} tone={t.tone}>{t.text}</Pill>)}
        </div>
      </GlassCard>
    </Locked>
  )
}
