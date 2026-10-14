export type TimelineStatus = 'done' | 'current' | 'pending'

export interface TimelineItem {
  at: string
  /** Bold lead-in ("Detect"), followed by a full stop as in the prototype. */
  phase?: string
  title: string
  /** Small second line. */
  detail?: string
  status: TimelineStatus
}

interface Props {
  items: TimelineItem[]
  ariaLabel?: string
}

/**
 * Prototype live timeline `#tl` (line 1573). Kept as a real ordered list (not
 * role="img") so screen readers can read every step.
 */
export function Timeline({ items, ariaLabel = 'Timeline' }: Props) {
  return (
    <ol className="tl" aria-label={ariaLabel}>
      {items.map((x, k) => (
        <li key={k} className={x.status === 'done' ? 'done' : x.status === 'current' ? 'done cur' : undefined} aria-current={x.status === 'current' ? 'step' : undefined}>
          <span className="tm">{x.at}</span>
          <span className="dot"></span>
          <span>
            {x.phase && <><b style={{ fontWeight: 500 }}>{x.phase}.</b> </>}
            {x.title}
            {x.detail != null && <small>{x.detail}</small>}
          </span>
        </li>
      ))}
    </ol>
  )
}
