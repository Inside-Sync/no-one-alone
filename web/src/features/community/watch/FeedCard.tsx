'use client'

import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { COMMUNITY_COPY } from '@/data/repo'
import type { WatchFeedItem } from '@/data/types'
import { Actions, keyActivate } from '../../individual/home/parts'

function FeedDrawerBody({ n }: { n: WatchFeedItem }) {
  return (
    <>
      <p className="fine">{n.source} · {n.age} ago</p>
      <p style={{ fontSize: 14, lineHeight: 1.55 }}>{n.body}</p>
      <Actions list={COMMUNITY_COPY.actions.news} />
    </>
  )
}

/** `Feed for community staff` (c6): auto-summarised items with their source shown. */
export function FeedCard({ items }: { items: WatchFeedItem[] }) {
  const drawer = useDrawer()
  const c = COMMUNITY_COPY.watch.feed
  return (
    <GlassCard span={6}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="news" /></span></span>
        <h2>{c.title}</h2>
        <span className="meta">{c.meta}</span>
      </div>
      <ul className="news" id="newsCom">
        {items.map((n) => {
          const open = () => drawer.open(n.headline, <FeedDrawerBody n={n} />)
          return (
            <li key={n.headline} role="button" tabIndex={0} onClick={(e) => { if (!(e.target as Element).closest('button')) open() }} onKeyDown={keyActivate(open)}>
              <span className="src">{n.source}</span>
              <span className="src">{n.age} ago</span>
              <b>{n.headline}</b>
              <p>{n.body}</p>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}
