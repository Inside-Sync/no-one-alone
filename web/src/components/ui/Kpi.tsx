import type { ReactNode } from 'react'

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
}

/** Prototype `kpiHTML`: `.glass.kpi` with `.k`, `.v`, spark, `.d`. */
export function Kpi({ label, value, unit, color, children, sub, delta, tone = 'good' }: Props) {
  return (
    <div className="glass kpi">
      <span className="k">{color && <i style={{ background: color }}></i>}{label}</span>
      <b className="v">{value}{unit != null && unit !== '' && <small>{unit}</small>}</b>
      {children}
      {(sub != null || delta != null) && (
        <span className="d">
          <span>{sub}</span>
          <b style={{ color: `var(--${tone})` }}>{delta}</b>
        </span>
      )}
    </div>
  )
}
