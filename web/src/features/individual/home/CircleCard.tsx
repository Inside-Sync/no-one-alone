'use client'

import { useTranslation } from 'react-i18next'
import { Orbit } from '@/components/canvas/Orbit'
import { GlassCard } from '@/components/ui/GlassCard'
import { Avatar } from '@/components/ui/Avatar'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import type { CircleMember, OrbitScene } from '@/data/types'
import { Head } from './parts'

/** `💞 Her care circle` (c5): the 3D orbit (tap a ball for a toast) and the member list. */
export function CircleCard({ scene, members }: { scene: OrbitScene; members: CircleMember[] }) {
  const { t } = useTranslation('home')
  const toast = useToast()
  return (
    <GlassCard span={5}>
      <Head title={t('circle.title')} meta={t('circle.meta')} />
      <Orbit scene={scene} ariaLabel={t('circle.ariaLabel')} labels tilt={0.6} zoom={0.95} style={{ height: 290 }} onSelect={toast} />
      <ul className="ppl">
        {members.map((m) => (
          <li key={m.id}>
            <Avatar name={m.name} className="av sm" style={{ '--c': m.color } as React.CSSProperties}>{m.initials}</Avatar>
            <span><b>{m.name}</b><small>{m.note}</small></span>
            <Pill tone={m.role.tone}>{m.role.text}</Pill>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
