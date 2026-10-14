import type { ReactNode } from 'react'

export type CardSpan = 4 | 5 | 6 | 7 | 8 | 12

interface Props {
  span?: CardSpan
  id?: string
  className?: string
  children: ReactNode
}

/** `<article class="glass card c4">` — the prototype card shell. */
export function GlassCard({ span, id, className, children }: Props) {
  const cls = ['glass', 'card', span ? `c${span}` : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <article className={cls} id={id}>
      {children}
    </article>
  )
}
