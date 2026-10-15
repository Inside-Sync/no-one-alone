'use client'

import { useDrawer } from '@/components/ui/Drawer'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import type { WatchFeedItem } from '@/data/types'
import { Actions, keyActivate } from '../../individual/home/parts'
import type { ActionList } from '../../shared/drawers'

function FeedDrawerBody({ n }: { n: WatchFeedItem }) {
  const { t } = useTranslation('community')
  return (
    <>
      <p className="fine">{n.source} · {t('watch.feed.ago', { age: n.age })}</p>
      <p style={{ fontSize: 14, lineHeight: 1.55 }}>{n.body}</p>
      <Actions list={t('actions.news', { returnObjects: true }) as unknown as ActionList} />
    </>
  )
}

/** `Feed for community staff` (c6): auto-summarised items with their source shown. */
export function FeedCard({ items }: { items: WatchFeedItem[] }) {
  const drawer = useDrawer()
  const { t } = useTranslation('community')
  return (
    <GlassCard span={6}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="news" /></span></span>
        <h2>{t('watch.feed.title')}</h2>
        <span className="meta">{t('watch.feed.meta')}</span>
      </div>
      <ul className="news" id="newsCom" role="none">
        {items.map((n) => {
          const open = () => drawer.open(n.headline, <FeedDrawerBody n={n} />)
          return (
            <li key={n.headline} role="button" tabIndex={0} onClick={(e) => { if (!(e.target as Element).closest('button')) open() }} onKeyDown={keyActivate(open)}>
              <span className="src">{n.source}</span>
              <span className="src">{t('watch.feed.ago', { age: n.age })}</span>
              <b>{n.headline}</b>
              <p>{n.body}</p>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}
