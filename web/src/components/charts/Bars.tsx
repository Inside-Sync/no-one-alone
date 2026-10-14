interface Props {
  values: number[]
  labels: string[]
  /** Threshold: bars at or above it turn red and a dashed line is drawn (`.thr`). */
  goal?: { value: number; label: string }
  /** Value that maps to the full 96 px bar height. Defaults to the largest value. */
  max?: number
  /** Suffix after each value, e.g. "°". */
  unit?: string
  ariaLabel?: string
}

/** Prototype `vbars()` (line 1523): `.vbars` columns with an optional threshold line. */
export function Bars({ values, labels, goal, max = Math.max(...values), unit = '', ariaLabel }: Props) {
  const label =
    ariaLabel ??
    values.map((v, i) => `${labels[i]} ${v}${unit}`).join(', ') + (goal ? `; threshold ${goal.label}` : '')
  return (
    <div className="vbars" role="img" aria-label={label}>
      {values.map((v, i) => (
        <div key={i}>
          <b>{v}{unit}</b>
          <i style={{ height: Math.round((v / max) * 96) + 'px', background: goal && v >= goal.value ? '#d9443f' : '#1fb39c' }}></i>
          <span>{labels[i]}</span>
        </div>
      ))}
      {goal && (
        <span className="thr" style={{ bottom: (20 + (goal.value / max) * 96).toFixed(0) + 'px' }}>{goal.label}</span>
      )}
    </div>
  )
}
