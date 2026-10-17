'use client'

import { useState } from 'react'
import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { useTranslation } from 'react-i18next'
import type { NewsItem, Surroundings } from '@/data/types'
import { Actions, keyActivate } from '../home/parts'
import type { ActionList } from '@/features/shared/drawers'

function NewsDrawerBody({ n }: { n: NewsItem }) {
  const { t } = useTranslation('around')
  const { t: tc } = useTranslation('common')
  return (
    <>
      <p className="fine">{t(`newsCategory.${n.category}`).toUpperCase()} · {n.source} · {t('newsAge', { age: n.age })}</p>
      <p style={{ fontSize: 14, lineHeight: 1.55 }}>{n.body}</p>
      <p style={{ fontSize: '12.5px', color: 'var(--brand-text)' }}>{n.shownBecause}</p>
      <Actions list={tc('drawerActions.news', { returnObjects: true }) as unknown as ActionList} />
    </>
  )
}

/** `News that matters to her` (c6): category filter plus the items filtered for her profile. */
export function NewsCard({ s }: { s: Surroundings }) {
  const drawer = useDrawer()
  const { t } = useTranslation('around')
  const [cur, setCur] = useState<string>('All')
  const shown = s.news.filter((n) => cur === 'All' || n.category === cur)
  return (
    <GlassCard span={6}>
      <div className="ch">
        <h2><Glyph name={s.newsHeading.icon} />{s.newsHeading.title}</h2>
        <span className="meta">{s.newsHeading.meta}</span>
      </div>
      <div className="seg" role="group" aria-label={t('newsFilterLabel')}>
        {s.newsCategories.map((c) => (
          <button key={c} type="button" aria-pressed={c === cur} onClick={() => setCur(c)}>{t(`newsCategory.${c}`)}</button>
        ))}
      </div>
      <ul className="news" role="none">
        {shown.map((n) => {
          const open = () => drawer.open(n.headline, <NewsDrawerBody n={n} />)
          return (
            <li key={n.headline} role="button" tabIndex={0} onClick={open} onKeyDown={keyActivate(open)}>
              <span className="src">{t(`newsCategory.${n.category}`).toUpperCase()} · {n.source}</span>
              <span className="src">{t('newsAge', { age: n.age })}</span>
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
