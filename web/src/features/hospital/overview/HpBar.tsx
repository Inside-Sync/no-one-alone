import './overview.css'

/** A thin bar with its value at the end; `value` is the text shown, `pct` how far the bar is filled. */
export function HpBar({ pct, colour, value }: { pct: number; colour: string; value: string | number }) {
  return (
    <div className="hp-bar">
      <span aria-hidden="true"><i style={{ width: `${Math.min(pct, 100)}%`, background: colour }} /></span>
      <b>{value}</b>
    </div>
  )
}
