'use client'

import { Sparkline } from '@/components/charts/Sparkline'
import { useDrawer } from '@/components/ui/Drawer'
import { Kpi } from '@/components/ui/Kpi'
import { COMMUNITY_COPY, EXPLAIN, EXPLAIN_FALLBACK } from '@/data/repo'
import type { Kpi as KpiData, MiniStat } from '@/data/types'
import { ClickRow } from '../individual/ClickRow'
import { Actions, Kv, keyActivate } from '../individual/home/parts'

/** Prototype `explainFor` for the community view: first EXPLAIN key found in the label, else the community fallback. */
function explainFor(label: string): string {
  const t = label.toLowerCase()
  for (const k of Object.keys(EXPLAIN)) if (t.includes(k)) return EXPLAIN[k]
  return EXPLAIN_FALLBACK.community
}

const para = { fontSize: 14, lineHeight: 1.55 } as const

function KpiBody({ kpi }: { kpi: KpiData }) {
  return (
    <>
      <div className="dr-big"><b>{kpi.value}{kpi.unit !== '' && <small>{kpi.unit}</small>}</b></div>
      <div className="dr-chart"><Sparkline values={kpi.spark} color={kpi.color} decorative /></div>
      <Kv rows={[['Compared with', kpi.baseline], ['Change', kpi.delta]]} />
      <p style={para}>{explainFor(kpi.label)}</p>
      <Actions list={COMMUNITY_COPY.actions.kpi} />
    </>
  )
}

/** `.kpis` row of a community page: tiles that open their detail drawer. */
export function CommunityKpis({ id, kpis }: { id: string; kpis: KpiData[] }) {
  const drawer = useDrawer()
  return (
    <div className="c12 kpis" id={id}>
      {kpis.map((k) => (
        <Kpi key={k.label} label={k.label} value={k.value} unit={k.unit} color={k.color} sub={k.baseline} delta={k.delta} tone={k.tone}
          onOpen={() => drawer.open(k.label, <KpiBody kpi={k} />)}>
          <Sparkline values={k.spark} color={k.color} decorative />
        </Kpi>
      ))}
    </div>
  )
}

function MiniBody({ stat }: { stat: MiniStat }) {
  return (
    <>
      <div className="dr-big"><b>{stat.value}</b><span className="muted">{stat.note}</span></div>
      <p style={para}>{explainFor(stat.label)}</p>
      <Actions list={COMMUNITY_COPY.actions.mini} />
    </>
  )
}

/** A `.mini` grid whose cells open the community info drawer; a toned note takes its colour. */
export function CommunityMini({ stats }: { stats: readonly MiniStat[] }) {
  const drawer = useDrawer()
  return (
    <div className="mini">
      {stats.map((s) => {
        const open = () => drawer.open(s.label, <MiniBody stat={s} />)
        return (
          <div key={s.label} role="button" tabIndex={0} onClick={open} onKeyDown={keyActivate(open)}>
            <small>{s.label}</small>
            <b>{s.value}</b>
            <em style={s.tone ? { color: `var(--${s.tone})` } : undefined}>{s.note}</em>
          </div>
        )
      })}
    </div>
  )
}

/** A `tbody tr` of a community table: opens the "Plan a visit / Call in their language" drawer. */
export const CommunityRow = (props: Omit<Parameters<typeof ClickRow>[0], 'actions'>) => (
  <ClickRow {...props} actions={COMMUNITY_COPY.actions.row} buttonsStayInside />
)
