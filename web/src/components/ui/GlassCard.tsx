import type { ReactNode } from 'react'

export type CardSpan = 4 | 5 | 6 | 7 | 8 | 12

interface Props {
  span?: CardSpan
  id?: string
  className?: string
  /** Walkthrough target: the element carrying `data-tour="<tour>"` is outlined by a tour step. */
  tour?: string
  children: ReactNode
}

/** `<article class="glass card c4">` — the prototype card shell. */
export function GlassCard({ span, id, className, tour, children }: Props) {
  const cls = ['glass', 'card', span ? `c${span}` : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <article className={cls} id={id} data-tour={tour}>
      {children}
    </article>
  )
}
