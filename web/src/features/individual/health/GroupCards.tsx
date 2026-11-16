'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { SourceLine } from '@/features/shared/SourceLine'
import { Icon } from '@/components/ui/Icon'
import { Locked } from '@/components/ui/Locked'
import type { HealthGroup } from '@/data/types'
import { MiniGrid } from '../home/parts'

/** `#groups` (c12 grid of nine cards): each card locks on its own category (`gc`, prototype line 1904). */
export function GroupCards({ groups }: { groups: HealthGroup[] }) {
  const { t } = useTranslation('health')
  const src = t('src.groups', { returnObjects: true })
  return (
    <div className="c12 groups">
      {groups.map((g, i) => (
        <Locked key={g.title} cat={g.category}>
          <GlassCard>
            <div className="ch"><span className="li"><span className="ic"><Icon name={g.icon} tint /></span></span><h2>{g.title}</h2></div>
            <MiniGrid stats={g.metrics} plain />
            <SourceLine source={src[i].source} time={src[i].time} />
          </GlassCard>
        </Locked>
      ))}
    </div>
  )
}
