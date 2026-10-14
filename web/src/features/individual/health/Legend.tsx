interface Item {
  readonly color: string
  readonly label: string
  readonly round?: boolean
}

/** `.legend`: a swatch and a label per entry. */
export function Legend({ items }: { items: readonly Item[] }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span key={it.label}><i style={{ background: it.color, ...(it.round ? { borderRadius: '50%' } : {}) }}></i>{it.label}</span>
      ))}
    </div>
  )
}
