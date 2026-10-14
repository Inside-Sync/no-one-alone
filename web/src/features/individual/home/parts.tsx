'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { MiniStat } from '@/data/types'
import { MiniGrid as SharedMiniGrid, type DrawerConfig } from '../../shared/drawers'

export { Actions, Kv, keyActivate } from '../../shared/drawers'

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

/** Individual-view tile drawer: its buttons and `explainFor` fallback. */
export const INDIVIDUAL_MINI: DrawerConfig = {
  actions: [['🗣️ Ask her about it', 'Added to her next chat at 18:00', 'Added'], ['📈 See 30-day trend', 'Trend view coming in the full app', 'Noted']],
  fallback: 'individual',
}

/** A `.mini` grid of the individual view. */
export function MiniGrid(props: { stats: readonly MiniStat[]; plain?: boolean }) {
  return <SharedMiniGrid {...INDIVIDUAL_MINI} {...props} />
}
