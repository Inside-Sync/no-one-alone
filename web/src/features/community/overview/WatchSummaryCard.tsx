'use client'

import { Icon } from '@/components/ui/Icon'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import type { WatchListItem } from '@/data/types'
import { useRouter } from '@/app/navigation'

/** `Neighbourhood watch` mini (c6): this week's three items and a link to the watch page. */
export function WatchSummaryCard({ items }: { items: WatchListItem[] }) {
  const router = useRouter()
  const { t } = useTranslation('community')
  return (
    <GlassCard span={6}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="eye" /></span></span>
        <h2>{t('overview.watch.title')}</h2>
        <span className="meta">{t('overview.watch.meta')}</span>
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
      <button type="button" className="btn soft" onClick={() => router.push('/community/watch')}>{t('overview.watch.open')}</button>
    </GlassCard>
  )
}
