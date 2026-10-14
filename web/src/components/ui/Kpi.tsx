import type { KeyboardEvent, ReactNode } from 'react'
import { toneVar } from '@/lib/tone'

export type KpiTone = 'good' | 'warn' | 'bad'

interface Props {
  label: ReactNode
  value: ReactNode
  /** Small unit after the value (`<small>`). */
  unit?: ReactNode
  /** Colour of the dot before the label. */
  color?: string
  /** Optional sparkline, rendered between the value and the footer. */
  children?: ReactNode
  /** Footer left text, e.g. "usual 63". */
  sub?: ReactNode
  delta?: ReactNode
  tone?: KpiTone
  /** Plain-language tile: an emoji replaces the colour dot and the footer uses the body font (`kpiE`). */
  emoji?: ReactNode
  /** Makes the tile a keyboard-reachable button (the prototype's `markClickable`). */
  onOpen?: () => void
}

/** Prototype `kpiHTML`: `.glass.kpi` with `.k`, `.v`, spark, `.d`. */
export function Kpi({ label, value, unit, color, children, sub, delta, tone = 'good', emoji, onOpen }: Props) {
  const open = onOpen
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: onOpen,
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        },
      }
    : {}
  return (
    <div className="glass kpi" data-plain={emoji != null ? '1' : undefined} {...open}>
      <span className="k">
        {emoji != null ? <span className="emo">{emoji}</span> : color && <i style={{ background: color }}></i>}
        {label}
      </span>
      <b className="v">{value}{unit != null && unit !== '' && <small>{unit}</small>}</b>
      {children}
      {(sub != null || delta != null) && (
        <span className="d" style={emoji != null ? { fontFamily: 'var(--font)' } : undefined}>
          <span>{sub}</span>
          <b style={{ color: toneVar(tone) }}>{delta}</b>
        </span>
      )}
    </div>
  )
}
