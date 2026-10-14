'use client'

import { COMMUNITY_COPY } from '@/data/repo'
import type { Kpi as KpiData, MiniStat } from '@/data/types'
import { ClickRow } from '../individual/ClickRow'
import { KpiRow, MiniGrid, type DrawerConfig } from '../shared/drawers'

const KPI: DrawerConfig = { actions: COMMUNITY_COPY.actions.kpi, fallback: 'community' }
const MINI: DrawerConfig = { actions: COMMUNITY_COPY.actions.mini, fallback: 'community' }

/** `.kpis` row of a community page: tiles that open their detail drawer. */
export const CommunityKpis = ({ id, kpis }: { id: string; kpis: KpiData[] }) => <KpiRow id={id} kpis={kpis} {...KPI} />

/** A `.mini` grid whose cells open the community info drawer. */
export const CommunityMini = ({ stats }: { stats: readonly MiniStat[] }) => <MiniGrid stats={stats} {...MINI} />

/** A `tbody tr` of a community table: opens the "Plan a visit / Call in their language" drawer. */
export const CommunityRow = (props: Omit<Parameters<typeof ClickRow>[0], 'actions'>) => (
  <ClickRow {...props} actions={COMMUNITY_COPY.actions.row} buttonsStayInside />
)
