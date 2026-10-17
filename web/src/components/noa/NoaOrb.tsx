import type { CSSProperties } from 'react'

export function NoaOrb({ size, talk }: { size: number; talk?: boolean }) {
  return <i className={talk ? 'om talk' : 'om'} style={{ '--s': `${size}px` } as CSSProperties} aria-hidden="true" />
}
