'use client'

import { Orbit } from '@/components/canvas/Orbit'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import { HOME_COPY } from '@/data/repo'
import type { CircleMember, OrbitScene } from '@/data/types'
import { Head } from './parts'

/** `💞 Her care circle` (c5): the 3D orbit (tap a ball for a toast) and the member list. */
export function CircleCard({ scene, members }: { scene: OrbitScene; members: CircleMember[] }) {
  const toast = useToast()
  const c = HOME_COPY.circle
  return (
    <GlassCard span={5}>
      <Head title={c.title} meta={c.meta} />
      <Orbit scene={scene} ariaLabel={c.ariaLabel} labels tilt={0.6} zoom={0.95} style={{ height: 290 }} onSelect={toast} />
      <ul className="ppl">
        {members.map((m) => (
          <li key={m.id}>
            <span className="av sm" style={{ '--c': m.color } as React.CSSProperties}>{m.initials}</span>
            <span><b>{m.name}</b><small>{m.note}</small></span>
            <Pill tone={m.role.tone}>{m.role.text}</Pill>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
