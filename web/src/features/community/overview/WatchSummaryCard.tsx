'use client'

import { Icon } from '@/components/ui/Icon'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { COMMUNITY_COPY } from '@/data/repo'
import type { WatchListItem } from '@/data/types'
import { useRouter } from '@/app/navigation'

/** `Neighbourhood watch` mini (c6): this week's three items and a link to the watch page. */
export function WatchSummaryCard({ items }: { items: WatchListItem[] }) {
  const router = useRouter()
  const c = COMMUNITY_COPY.overview.watch
  return (
    <GlassCard span={6}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="eye" /></span></span>
        <h2>{c.title}</h2>
        <span className="meta">{c.meta}</span>
      </div>
      <ul className="list">
        {items.map((i) => (
          <li key={i.title}>
            <span className="li" style={{ color: `var(--${i.tone})` }}><span className="ic"><Icon name={i.icon} /></span></span>
            <span><b>{i.title}</b><small>{i.detail}</small></span>
            <Pill tone={i.pill.tone}>{i.pill.text}</Pill>
          </li>
        ))}
      </ul>
      <button type="button" className="btn soft" onClick={() => router.push('/community/watch')}>{c.open}</button>
    </GlassCard>
  )
}
