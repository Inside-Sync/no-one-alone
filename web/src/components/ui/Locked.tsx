'use client'

import type { ReactNode } from 'react'
import { lockMessage, sees, type CategoryId } from '@/domain/consent'
import { useAppState } from '@/state/AppState'
import type { CardSpan } from './GlassCard'

interface Props {
  cat: CategoryId
  /** Grid span of the placeholder card, so the layout does not jump. */
  span?: CardSpan
  className?: string
  children: ReactNode
}

/**
 * Wraps a card that belongs to a consent category. When the current family
 * viewer may not see it (or consent is still loading), the children are NOT
 * rendered: only a blurred placeholder with the prototype's lock message.
 */
export function Locked({ cat, span, className, children }: Props) {
  const { who, viewer, paused, share } = useAppState()
  if (who !== 'family') return <>{children}</>
  if (share && sees(share, paused, viewer, cat)) return <>{children}</>
  const cls = ['glass', 'card', span ? `c${span}` : '', 'locked-slot', className ?? ''].filter(Boolean).join(' ')
  return (
    <div className={cls} data-scat={cat}>
      <div className="locked-fill" aria-hidden="true" />
      <span className="locked-msg">
        <span aria-hidden="true">🔒&nbsp;&nbsp;</span>
        {share ? lockMessage(cat, paused) : 'Checking what Margaret shares'}
      </span>
    </div>
  )
}
