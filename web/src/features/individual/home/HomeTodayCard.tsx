'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Locked } from '@/components/ui/Locked'
import { Pill } from '@/components/ui/Pill'
import { HOME_COPY } from '@/data/repo'
import type { HealthData } from '@/data/types'
import { Head, MiniGrid } from './parts'

/** `🏠 Her home today` (c4): heat, air and drink-reminder readings (home sensors category). */
export function HomeTodayCard({ home }: { home: HealthData['homeToday'] }) {
  return (
    <Locked cat="home" span={4}>
      <GlassCard span={4}>
        <Head title={HOME_COPY.home.title}><Pill tone={home.pill.tone}>{home.pill.text}</Pill></Head>
        <MiniGrid stats={home.stats} />
        <p className="fine">{home.note}</p>
      </GlassCard>
    </Locked>
  )
}
