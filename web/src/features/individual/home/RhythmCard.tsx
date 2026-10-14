'use client'

import { Heatmap } from '@/components/charts/Heatmap'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Locked } from '@/components/ui/Locked'
import { HOME_COPY } from '@/data/repo'
import type { HealthData } from '@/data/types'
import { Head } from './parts'

/** `🕰️ Daily rhythm` (c7): hour-by-hour heatmap of the week plus two plain-language notes (home sensors category). */
export function RhythmCard({ rhythm }: { rhythm: HealthData['rhythm'] }) {
  const c = HOME_COPY.rhythm
  return (
    <Locked cat="home" span={7}>
      <GlassCard span={7}>
        <Head title={c.title} meta={c.meta} />
        <Heatmap
          rows={rhythm.days.map((d) => d.cells.map((x) => x.value))}
          rowLabels={rhythm.days.map((d) => d.label)}
          anomaly={rhythm.days.map((d) => d.cells.map((x) => x.anomaly))}
          future={rhythm.days.map((d) => d.cells.map((x) => x.future))}
        />
        <div className="legend">
          <span>{c.legend[0]}</span><span className="ramp"></span><span>{c.legend[1]}</span>
          <span><i style={{ boxShadow: '0 0 0 1.5px var(--sos)' }}></i>{c.legend[2]}</span>
        </div>
        <ul className="why">
          {rhythm.notes.map((n) => (
            <li key={n.lead}>
              <span className="ic"><Icon name={n.icon} /></span>
              <span><b>{n.lead}</b>{n.text}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </Locked>
  )
}
