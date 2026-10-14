interface Props {
  items: { label: string; delta: number }[]
  /** Magnitude that fills half the track (the prototype uses .6 for SHAP, 8.1 for demand). */
  base: number
  /** Decimals shown, 2 for SHAP, 1 for demand drivers. */
  digits?: number
  ariaLabel?: string
}

/** Prototype SHAP bars `#shap` (line 1446) / `#demandShap`: red right = raises, green left = lowers. */
export function Waterfall({ items, base, digits = 2, ariaLabel }: Props) {
  const fmt = (d: number) => (d > 0 ? '+' : '−') + Math.abs(d).toFixed(digits)
  return (
    <div className="shap" role="img" aria-label={ariaLabel ?? items.map((s) => `${s.label} ${fmt(s.delta)}`).join(', ')}>
      {items.map((s, i) => {
        const w = (Math.abs(s.delta) / base) * 50 + '%'
        const up = s.delta > 0
        return (
          <div key={i}>
            <span>{s.label}</span>
            <span className="b">
              <i style={up ? { left: '50%', background: '#d9443f', width: w } : { right: '50%', background: '#1fb39c', width: w }}></i>
            </span>
            <b style={{ color: up ? 'var(--bad)' : 'var(--good)' }}>{fmt(s.delta)}</b>
          </div>
        )
      })}
    </div>
  )
}
