'use client'

import { useState } from 'react'
import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { AROUND_COPY, DRAWER_ACTIONS } from '@/data/repo'
import type { NewsItem, Surroundings } from '@/data/types'
import { Actions, keyActivate } from '../home/parts'

function NewsDrawerBody({ n }: { n: NewsItem }) {
  return (
    <>
      <p className="fine">{n.category.toUpperCase()} · {n.source} · {n.age} ago</p>
      <p style={{ fontSize: 14, lineHeight: 1.55 }}>{n.body}</p>
      <p style={{ fontSize: '12.5px', color: 'var(--brand)' }}>{n.shownBecause}</p>
      <Actions list={DRAWER_ACTIONS.news} />
    </>
  )
}

/** `📰 News that matters to her` (c6): category filter plus the items filtered for her profile. */
export function NewsCard({ s }: { s: Surroundings }) {
  const drawer = useDrawer()
  const [cur, setCur] = useState<string>('All')
  const shown = s.news.filter((n) => cur === 'All' || n.category === cur)
  return (
    <GlassCard span={6}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="news" /></span></span>
        <h2>{s.newsHeading.title}</h2>
        <span className="meta">{s.newsHeading.meta}</span>
      </div>
      <div className="seg" role="group" aria-label={AROUND_COPY.newsFilterLabel}>
        {s.newsCategories.map((c) => (
          <button key={c} type="button" aria-pressed={c === cur} onClick={() => setCur(c)}>{c}</button>
        ))}
      </div>
      <ul className="news">
        {shown.map((n) => {
          const open = () => drawer.open(n.headline, <NewsDrawerBody n={n} />)
          return (
            <li key={n.headline} role="button" tabIndex={0} onClick={open} onKeyDown={keyActivate(open)}>
              <span className="src">{n.category.toUpperCase()} · {n.source}</span>
              <span className="src">{n.age} ago</span>
              <b>{n.headline}</b>
              <p>{n.body}</p>
              <span className="why2">{n.shownBecause}</span>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}
