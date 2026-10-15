'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MiniStat } from '@/data/types'
import { MiniGrid as SharedMiniGrid } from '../../shared/drawers'

export { Actions, Kv, keyActivate, type ActionList } from '../../shared/drawers'

/** `.ch` header without the icon bubble: the prototype removes it when the title starts with an emoji. */
export function Head({ title, meta, children, small }: { title: ReactNode; meta?: ReactNode; children?: ReactNode; small?: boolean }) {
  const h: CSSProperties | undefined = small ? { fontSize: '13.5px' } : undefined
  return (
    <div className="ch">
      <h2 style={h}>{title}</h2>
      {meta != null && <span className="meta">{meta}</span>}
      {children}
    </div>
  )
}

/** A `.mini` grid of the individual view: its tile drawer has the `home:drawer.mini` buttons and the individual fallback. */
export function MiniGrid(props: { stats: readonly MiniStat[]; plain?: boolean }) {
  const { t } = useTranslation('home')
  return <SharedMiniGrid actions={t('drawer.mini', { returnObjects: true })} fallback="individual" {...props} />
}
