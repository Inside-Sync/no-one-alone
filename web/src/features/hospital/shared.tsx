'use client'

import { useTranslation } from 'react-i18next'
import type { Kpi as KpiData, MiniStat } from '@/data/types'
import { ClickRow } from '../individual/ClickRow'
import { KpiRow, MiniGrid, type ActionList } from '../shared/drawers'

/** `.kpis` row of a hospital page: six tiles, each opening its detail drawer. */
export function HospitalKpis({ id, kpis }: { id: string; kpis: KpiData[] }) {
  const { t } = useTranslation('hospital')
  return <KpiRow id={id} kpis={kpis} actions={t('actions.kpi', { returnObjects: true }) as unknown as ActionList} fallback="hospital" />
}

/** A `.mini` grid whose cells open the hospital info drawer. */
export function HospitalMini({ stats }: { stats: readonly MiniStat[] }) {
  const { t } = useTranslation('hospital')
  return <MiniGrid stats={stats} actions={t('actions.mini', { returnObjects: true }) as unknown as ActionList} fallback="hospital" />
}

/** A `tbody tr` of a hospital table: opens the "Open full chart / Message GP / Assign to me" drawer. */
export function HospitalRow(props: Omit<Parameters<typeof ClickRow>[0], 'actions'>) {
  const { t } = useTranslation('hospital')
  return <ClickRow {...props} actions={t('actions.row', { returnObjects: true }) as unknown as ActionList} />
}
