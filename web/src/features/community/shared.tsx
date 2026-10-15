'use client'

import { useTranslation } from 'react-i18next'
import type { Kpi as KpiData, MiniStat } from '@/data/types'
import { ClickRow } from '../individual/ClickRow'
import { KpiRow, MiniGrid, type ActionList } from '../shared/drawers'

/** `.kpis` row of a community page: tiles that open their detail drawer. */
export function CommunityKpis({ id, kpis }: { id: string; kpis: KpiData[] }) {
  const { t } = useTranslation('community')
  return <KpiRow id={id} kpis={kpis} actions={t('actions.kpi', { returnObjects: true }) as unknown as ActionList} fallback="community" />
}

/** A `.mini` grid whose cells open the community info drawer. */
export function CommunityMini({ stats }: { stats: readonly MiniStat[] }) {
  const { t } = useTranslation('community')
  return <MiniGrid stats={stats} actions={t('actions.mini', { returnObjects: true }) as unknown as ActionList} fallback="community" />
}

/** A `tbody tr` of a community table: opens the "Plan a visit / Call in their language" drawer. */
export function CommunityRow(props: Omit<Parameters<typeof ClickRow>[0], 'actions'>) {
  const { t } = useTranslation('community')
  return <ClickRow {...props} actions={t('actions.row', { returnObjects: true }) as unknown as ActionList} buttonsStayInside />
}
