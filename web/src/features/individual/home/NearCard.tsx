'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { HOME_COPY } from '@/data/repo'
import type { Surroundings } from '@/data/types'
import { Head } from './parts'

/** `🤝 People and places near her` (c4). */
export function NearCard({ nearby }: { nearby: Surroundings['nearby'] }) {
  return (
    <GlassCard span={4}>
      <Head title={HOME_COPY.near.title} meta={HOME_COPY.near.meta} />
      <ul className="list">
        {nearby.map((n) => (
          <li key={n.name}>
            <span className="av sm" style={{ '--c': n.color } as React.CSSProperties}>{n.initials}</span>
            <span><b>{n.name}</b><small>{n.note}</small></span>
            <Pill tone={n.pill.tone}>{n.pill.text}</Pill>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
