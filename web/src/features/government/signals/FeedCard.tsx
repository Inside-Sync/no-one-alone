'use client'

import { useDrawer } from '@/components/ui/Drawer'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import type { FeedItem } from '@/data/government.types'
import { Actions, keyActivate } from '../../individual/home/parts'
import type { ActionList } from '../../shared/drawers'

function FeedDrawerBody({ n }: { n: FeedItem }) {
  const { t } = useTranslation('government')
  return (
    <>
      <p className="fine">{n.source} · {n.age}</p>
      <p style={{ fontSize: 14, lineHeight: 1.55 }}>{n.body}</p>
      <Actions list={t('actions.news', { returnObjects: true }) as unknown as ActionList} />
    </>
  )
}

/** `Feed for programme staff` (c6): auto-summarised items with their source shown. */
export function FeedCard({ items }: { items: FeedItem[] }) {
  const drawer = useDrawer()
  const { t } = useTranslation('government')
  return (
    <GlassCard span={6}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="news" /></span></span>
        <h2>{t('signals.feed.title')}</h2>
        <span className="meta">{t('signals.feed.meta')}</span>
      </div>
      <ul className="news" id="newsCom" role="none">
        {items.map((n) => {
          const open = () => drawer.open(n.headline, <FeedDrawerBody n={n} />)
          return (
            <li key={n.headline} role="button" tabIndex={0} onClick={(e) => { if (!(e.target as Element).closest('button')) open() }} onKeyDown={keyActivate(open)}>
              <span className="src">{n.source}</span>
              <span className="src">{n.age}</span>
              <b>{n.headline}</b>
              <p>{n.body}</p>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}
