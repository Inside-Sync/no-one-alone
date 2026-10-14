'use client'

import { Fragment, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { Sparkline } from '@/components/charts/Sparkline'
import { useDrawer } from '@/components/ui/Drawer'
import { Kpi } from '@/components/ui/Kpi'
import { OnceButton } from '@/components/ui/OnceButton'
import { EXPLAIN, EXPLAIN_FALLBACK } from '@/data/repo'
import type { Kpi as KpiData, MiniStat } from '@/data/types'
import { textTone, toneVar } from '@/lib/tone'

/** `[label, toast, done]` buttons of a drawer (prototype `actions()`). */
export type ActionList = readonly (readonly [label: string, toast: string, done: string])[]

/** What differs between the views' tile drawers: the buttons, and which `explainFor` fallback applies. */
export interface DrawerConfig {
  actions: ActionList
  fallback: keyof typeof EXPLAIN_FALLBACK
}

/** Prototype `explainFor`: first EXPLAIN key found in the label, else the view's fallback. */
export function explainFor(label: string, fallback: DrawerConfig['fallback']): string {
  const t = label.toLowerCase()
  for (const k of Object.keys(EXPLAIN)) if (t.includes(k)) return EXPLAIN[k]
  return EXPLAIN_FALLBACK[fallback]
}

/** Prototype `actions()`: a row of once-only buttons, the first solid and the rest soft. */
export function Actions({ list }: { list: ActionList }) {
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

/** `.kv2` list used by the detail drawers. */
export function Kv({ rows }: { rows: readonly (readonly [label: string, value: ReactNode, color?: string])[] }) {
  return (
    <div className="kv2">
      {rows.map(([k, v, color]) => (
        <Fragment key={k}>
          <span>{k}</span>
          <b style={{ ...plain, color: textTone(color) }}>{v}</b>
        </Fragment>
      ))}
    </div>
  )
}

interface KpiBodyProps extends DrawerConfig {
  kpi: KpiData
  /** Text matched against EXPLAIN; the individual view prefixes the tile's emoji. */
  explainLabel?: string
}

/** KPI tile drawer body (prototype `.kpi` click handler): value, trend, comparison, explanation, actions. */
export function KpiDrawerBody({ kpi, actions, fallback, explainLabel = kpi.label }: KpiBodyProps) {
  return (
    <>
      <div className="dr-big"><b>{kpi.value}{kpi.unit !== '' && <small>{kpi.unit}</small>}</b></div>
      <div className="dr-chart"><Sparkline values={kpi.spark} color={kpi.color} decorative /></div>
      <Kv rows={[['Compared with', kpi.baseline], ['Change', kpi.delta]]} />
      <p style={para}>{explainFor(explainLabel, fallback)}</p>
      <Actions list={actions} />
    </>
  )
}

/** `.kpis` row: tiles that each open their detail drawer. */
export function KpiRow({ id, kpis, ...config }: DrawerConfig & { id: string; kpis: KpiData[] }) {
  const drawer = useDrawer()
  return (
    <div className="c12 kpis" id={id}>
      {kpis.map((k) => (
        <Kpi key={k.label} label={k.label} value={k.value} unit={k.unit} color={k.color} sub={k.baseline} delta={k.delta} tone={k.tone}
          onOpen={() => drawer.open(k.label, <KpiDrawerBody kpi={k} {...config} />)}>
          <Sparkline values={k.spark} color={k.color} decorative />
        </Kpi>
      ))}
    </div>
  )
}

/** Body of the "tap a tile" drawer for a `.mini` cell. */
function MiniDrawerBody({ stat, actions, fallback }: DrawerConfig & { stat: MiniStat }) {
  return (
    <>
      <div className="dr-big"><b>{stat.value}</b><span className="muted">{stat.note}</span></div>
      <p style={para}>{explainFor(stat.label, fallback)}</p>
      <Actions list={actions} />
    </>
  )
}

/** Plain-language tiles (prototype line 1800) swap the mono face for the body font. */
const PLAIN_B: CSSProperties = { fontFamily: 'var(--font)', fontSize: 16, fontWeight: 500 }
const PLAIN_EM: CSSProperties = { fontFamily: 'var(--font)' }

/** A `.mini` grid whose cells open the info drawer; a toned note takes its colour. */
export function MiniGrid({ stats, plain: plainFont, ...config }: DrawerConfig & { stats: readonly MiniStat[]; plain?: boolean }) {
  const drawer = useDrawer()
  return (
    <div className="mini">
      {stats.map((s) => {
        const open = () => drawer.open(s.label, <MiniDrawerBody stat={s} {...config} />)
        return (
          <div key={s.label} role="button" tabIndex={0} onClick={open} onKeyDown={keyActivate(open)}>
            <small>{s.label}</small>
            <b style={plainFont ? PLAIN_B : undefined}>{s.value}</b>
            <em style={{ ...(plainFont ? PLAIN_EM : undefined), ...(s.tone ? { color: toneVar(s.tone) } : undefined) }}>{s.note}</em>
          </div>
        )
      })}
    </div>
  )
}
