interface Props {
  value: number
  max: number
  label: string
  unit?: string
  color?: string
  /** Text in the middle; defaults to `value`. */
  display?: string
  ariaLabel?: string
}

const ARC = 'M12 62 A48 48 0 0 1 108 62'
const L = Math.PI * 48

/** Prototype activity gauge `#gauges` (line 1604): half ring in a 120×72 svg plus caption. */
export function Ring({ value, max, label, unit = '', color = '#1fb39c', display, ariaLabel }: Props) {
  const f = value / max
  return (
    <div role="img" aria-label={ariaLabel ?? `${label}: ${value} of ${max}${unit ? ' ' + unit : ''}`}>
      <svg viewBox="0 0 120 72" aria-hidden="true">
        <path d={ARC} fill="none" stroke="var(--track)" strokeWidth="11" strokeLinecap="round" />
        <path d={ARC} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" strokeDasharray={(L * f).toFixed(1) + ' ' + L.toFixed(1)} />
        <text x="60" y="58" textAnchor="middle" style={{ fontSize: '20px', fill: 'var(--ink)', fontFamily: 'var(--font)', fontWeight: 300 }}>{display ?? value}</text>
      </svg>
      <b>{label}</b>
      <small>of {max}{unit ? ' ' + unit : ''}</small>
    </div>
  )
}
