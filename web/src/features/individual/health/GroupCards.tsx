'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Locked } from '@/components/ui/Locked'
import type { HealthGroup } from '@/data/types'
import { MiniGrid } from '../home/parts'

/** `#groups` (c12 grid of nine cards): each card locks on its own category (`gc`, prototype line 1904). */
export function GroupCards({ groups }: { groups: HealthGroup[] }) {
  return (
    <div className="c12 groups">
      {groups.map((g) => (
        <Locked key={g.title} cat={g.category}>
          <GlassCard>
            <div className="ch"><span className="li" style={{ fontSize: 17 }}>{g.emoji}</span><h2>{g.title}</h2></div>
            <MiniGrid stats={g.metrics} plain />
          </GlassCard>
        </Locked>
      ))}
    </div>
  )
}
