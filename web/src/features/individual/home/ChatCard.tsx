'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Locked } from '@/components/ui/Locked'
import { HOME_COPY } from '@/data/repo'
import type { HealthData } from '@/data/types'
import { Head, MiniGrid } from './parts'

/** `🗣️ Today's chat with her` (c4): the transcript and six speech measures (speech category). */
export function ChatCard({ chat }: { chat: HealthData['todayChat'] }) {
  return (
    <Locked cat="speech" span={4}>
      <GlassCard span={4}>
        <Head title={HOME_COPY.chat.title} meta={chat.time} />
        {chat.bubbles.map((b) => (
          <div key={b.text} className={b.from === 'margaret' ? 'bubble me' : 'bubble'}>{b.text}</div>
        ))}
        <MiniGrid stats={chat.stats} />
      </GlassCard>
    </Locked>
  )
}
