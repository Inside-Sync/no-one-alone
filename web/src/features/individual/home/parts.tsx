'use client'

import { Fragment, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { EXPLAIN, EXPLAIN_FALLBACK } from '@/data/repo'
import type { MiniStat } from '@/data/types'
import { OnceButton } from '@/components/ui/OnceButton'
import { useDrawer } from '@/components/ui/Drawer'

/** `.ch` header without the icon bubble: the prototype removes it when the title starts with an emoji. */
export function Head({ title, meta, children, small }: { title: ReactNode; meta?: ReactNode; children?: ReactNode; small?: boolean }) {
  const h: CSSProperties | undefined = small ? { fontSize: '13.5px' } : undefined
  return (
    <div className="ch">
      <h2 style={h}>{title}</h2>
      {meta != null && <span className="meta">{meta}</span>}
      {children}
    </div>
  )
}

/** Prototype `explainFor` for the individual view: first EXPLAIN key found in the label. */
export function explainFor(label: string): string {
  const t = label.toLowerCase()
  for (const k of Object.keys(EXPLAIN)) if (t.includes(k)) return EXPLAIN[k]
  return EXPLAIN_FALLBACK.individual
}

/** Prototype `actions()`: a row of once-only buttons, the first solid and the rest soft. */
export function Actions({ list }: { list: readonly (readonly [label: string, toast: string, done: string])[] }) {
  return (
    <div className="row">
      {list.map(([label, toast, done], i) => (
        <OnceButton key={label} className={i ? 'soft' : ''} toast={toast} done={`✓ ${done}`}>{label}</OnceButton>
      ))}
    </div>
  )
}

export const keyActivate = (open: () => void) => (e: KeyboardEvent) => {
  if (e.target !== e.currentTarget) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    open()
  }
}

const para: CSSProperties = { fontSize: 14, lineHeight: 1.55 }
const plain: CSSProperties = { fontWeight: 500 }

/** Body of the "tap a tile" drawer for a `.mini` cell. */
export function MiniInfo({ stat }: { stat: MiniStat }) {
  return (
    <>
      <div className="dr-big"><b>{stat.value}</b><span className="muted">{stat.note}</span></div>
      <p style={para}>{explainFor(stat.label)}</p>
      <Actions list={[['🗣️ Ask her about it', 'Added to her next chat at 18:00', 'Added'], ['📈 See 30-day trend', 'Trend view coming in the full app', 'Noted']]} />
    </>
  )
}

/** Plain-language tiles (prototype line 1800) swap the mono face for the body font. */
const PLAIN_B: CSSProperties = { fontFamily: 'var(--font)', fontSize: 16, fontWeight: 500 }
const PLAIN_EM: CSSProperties = { fontFamily: 'var(--font)' }

/** A `.mini` grid whose cells open the info drawer, like the prototype's click handler. */
export function MiniGrid({ stats, plain }: { stats: readonly MiniStat[]; plain?: boolean }) {
  const drawer = useDrawer()
  return (
    <div className="mini">
      {stats.map((s) => {
        const open = () => drawer.open(s.label, <MiniInfo stat={s} />)
        return (
          <div key={s.label} role="button" tabIndex={0} onClick={open} onKeyDown={keyActivate(open)}>
            <small>{s.label}</small>
            <b style={plain ? PLAIN_B : undefined}>{s.value}</b>
            <em style={{ ...(plain ? PLAIN_EM : undefined), ...(s.tone ? { color: `var(--${s.tone})` } : undefined) }}>{s.note}</em>
          </div>
        )
      })}
    </div>
  )
}

/** `.kv2` list used by the detail drawers. */
export function Kv({ rows }: { rows: readonly (readonly [label: string, value: ReactNode, color?: string])[] }) {
  return (
    <div className="kv2">
      {rows.map(([k, v, color]) => (
        <Fragment key={k}>
          <span>{k}</span>
          <b style={{ ...plain, color }}>{v}</b>
        </Fragment>
      ))}
    </div>
  )
}
