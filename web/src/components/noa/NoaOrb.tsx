import type { CSSProperties } from 'react'

/** Noa's identity mark: the CSS-only `.om` orb (UI spec 1.3); `talk` pulses its ring while Noa speaks. */
export function NoaOrb({ size, talk }: { size: number; talk?: boolean }) {
  return <i className={talk ? 'om talk' : 'om'} style={{ '--s': `${size}px` } as CSSProperties} aria-hidden="true" />
}
