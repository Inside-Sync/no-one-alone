'use client'

import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import type { Tab } from '@/domain/views'

/** `badges` maps a tab id to the small badge text (LIVE on Emergency, 1 on Pre-arrivals). */
export function Tabs({
  tabs, current, badges = {}, onSelect,
}: {
  tabs: Tab[]
  current: string | undefined
  badges?: Record<string, string | undefined>
  onSelect: (id: string) => void
}) {
  const { t: tr } = useTranslation()
  return (
    <nav className="tabs" aria-label={tr('nav.sections')} id="tabs">
      {tabs.map((t) => (
        <button key={t.id} type="button" aria-current={t.id === current ? 'page' : undefined} onClick={() => onSelect(t.id)}>
          {t.icon && <span className="ic"><Icon name={t.icon} /></span>}
          {t.label}
          {badges[t.id] && <> <span className="badge">{badges[t.id]}</span></>}
        </button>
      ))}
    </nav>
  )
}
