'use client'

import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/ui/Avatar'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import type { Surroundings } from '@/data/types'
import { Head } from './parts'

/** `People and places near her` (c4). */
export function NearCard({ nearby }: { nearby: Surroundings['nearby'] }) {
  const { t } = useTranslation('home')
  return (
    <GlassCard span={4}>
      <Head icon="handshake" title={t('near.title')} meta={t('near.meta')} />
      <ul className="list">
        {nearby.map((n) => (
          <li key={n.name}>
            <Avatar name={n.name} className="av sm" style={{ '--c': n.color } as React.CSSProperties}>{n.initials}</Avatar>
            <span><b>{n.name}</b><small>{n.note}</small></span>
            <Pill tone={n.pill.tone}>{n.pill.text}</Pill>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
