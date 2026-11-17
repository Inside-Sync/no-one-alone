'use client'

import { useTranslation } from 'react-i18next'
import type { Kpi as KpiData, MiniStat } from '@/data/types'
import { ClickRow } from '../individual/ClickRow'
import { Sparkline } from '@/components/charts/Sparkline'
import { useDrawer } from '@/components/ui/Drawer'
import { Kpi } from '@/components/ui/Kpi'
import { KpiDrawerBody, MiniGrid, type ActionList } from '../shared/drawers'

/** `.kpis` row of a government page: tiles that open their detail drawer; `columns` narrows the row (the signals page has four). */
export function GovernmentKpis({ id, kpis, columns }: { id: string; kpis: KpiData[]; columns?: number }) {
  const { t } = useTranslation('government')
  const drawer = useDrawer()
  const actions = t('actions.kpi', { returnObjects: true }) as unknown as ActionList
  return (
    <div className="c12 kpis" id={id} data-cols={columns}>
      {kpis.map((k) => (
        <Kpi key={k.label} label={k.label} value={k.value} unit={k.unit} color={k.color} sub={k.baseline} delta={k.delta} tone={k.tone}
          onOpen={() => drawer.open(k.label, <KpiDrawerBody kpi={k} actions={actions} fallback="government" />)}>
          <Sparkline values={k.spark} color={k.color} decorative />
        </Kpi>
      ))}
    </div>
  )
}

/** A `.mini` grid whose cells open the government info drawer. */
export function GovernmentMini({ stats }: { stats: readonly MiniStat[] }) {
  const { t } = useTranslation('government')
  return <MiniGrid stats={stats} actions={t('actions.mini', { returnObjects: true }) as unknown as ActionList} fallback="government" />
}

/** A `tbody tr` of a government table: opens the "Assign a coordinator / Call in their language" drawer. */
export function GovernmentRow(props: Omit<Parameters<typeof ClickRow>[0], 'actions'>) {
  const { t } = useTranslation('government')
  return <ClickRow {...props} actions={t('actions.row', { returnObjects: true }) as unknown as ActionList} buttonsStayInside />
}
