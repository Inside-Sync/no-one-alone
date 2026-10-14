'use client'

import { HOSPITAL_COPY } from '@/data/repo'
import type { Kpi as KpiData, MiniStat } from '@/data/types'
import { ClickRow } from '../individual/ClickRow'
import { KpiRow, MiniGrid, type DrawerConfig } from '../shared/drawers'

const KPI: DrawerConfig = { actions: HOSPITAL_COPY.actions.kpi, fallback: 'hospital' }
const MINI: DrawerConfig = { actions: HOSPITAL_COPY.actions.mini, fallback: 'hospital' }

/** `.kpis` row of a hospital page: six tiles, each opening its detail drawer. */
export const HospitalKpis = ({ id, kpis }: { id: string; kpis: KpiData[] }) => <KpiRow id={id} kpis={kpis} {...KPI} />

/** A `.mini` grid whose cells open the hospital info drawer. */
export const HospitalMini = ({ stats }: { stats: readonly MiniStat[] }) => <MiniGrid stats={stats} {...MINI} />

/** A `tbody tr` of a hospital table: opens the "Open full chart / Message GP / Assign to me" drawer. */
export const HospitalRow = (props: Omit<Parameters<typeof ClickRow>[0], 'actions'>) => (
  <ClickRow {...props} actions={HOSPITAL_COPY.actions.row} />
)
