'use client'

import { Sparkline } from '@/components/charts/Sparkline'
import { useDrawer } from '@/components/ui/Drawer'
import { Kpi } from '@/components/ui/Kpi'
import { HOSPITAL_COPY } from '@/data/repo'
import type { Kpi as KpiData, MiniStat } from '@/data/types'
import { ClickRow } from '../individual/ClickRow'
import { Actions, Kv, explainFor, keyActivate } from '../individual/home/parts'

/** `.kpi` drawer, hospital branch (prototype line 1838): value, trend, comparison, explanation, watchlist actions. */
function KpiBody({ kpi }: { kpi: KpiData }) {
  return (
    <>
      <div className="dr-big"><b>{kpi.value}{kpi.unit !== '' && <small>{kpi.unit}</small>}</b></div>
      <div className="dr-chart"><Sparkline values={kpi.spark} color={kpi.color} decorative /></div>
      <Kv rows={[['Compared with', kpi.baseline], ['Change', kpi.delta]]} />
      <p style={{ fontSize: 14, lineHeight: 1.55 }}>{explainFor(kpi.label)}</p>
      <Actions list={HOSPITAL_COPY.actions.kpi} />
    </>
  )
}

/** `.kpis` row of a hospital page: six tiles, each opening its detail drawer. */
export function HospitalKpis({ id, kpis }: { id: string; kpis: KpiData[] }) {
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

/** A `tbody tr` of a hospital table: opens the "Open full chart / Message GP / Assign to me" drawer. */
export const HospitalRow = (props: Omit<Parameters<typeof ClickRow>[0], 'actions'>) => (
  <ClickRow {...props} actions={HOSPITAL_COPY.actions.row} />
)

/** `.mini > div` drawer, hospital branch (prototype line 1845). */
function MiniBody({ stat }: { stat: MiniStat }) {
  return (
    <>
      <div className="dr-big"><b>{stat.value}</b><span className="muted">{stat.note}</span></div>
      <p style={{ fontSize: 14, lineHeight: 1.55 }}>{explainFor(stat.label)}</p>
      <Actions list={HOSPITAL_COPY.actions.mini} />
    </>
  )
}

/** A `.mini` grid whose cells open the hospital info drawer. */
export function HospitalMini({ stats }: { stats: readonly MiniStat[] }) {
  const drawer = useDrawer()
  return (
    <div className="mini">
      {stats.map((s) => {
        const open = () => drawer.open(s.label, <MiniBody stat={s} />)
        return (
          <div key={s.label} role="button" tabIndex={0} onClick={open} onKeyDown={keyActivate(open)}>
            <small>{s.label}</small>
            <b>{s.value}</b>
            <em>{s.note}</em>
          </div>
        )
      })}
    </div>
  )
}
