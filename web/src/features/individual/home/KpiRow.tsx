'use client'

import { Sparkline } from '@/components/charts/Sparkline'
import { useDrawer } from '@/components/ui/Drawer'
import { Kpi } from '@/components/ui/Kpi'
import { Locked } from '@/components/ui/Locked'
import type { CategoryId, Kpi as KpiData } from '@/data/types'
import { KpiDrawerBody } from './drawers'

/** Consent category of each tile, in order (`kc`, prototype line 1902). */
const KPI_CATEGORY: readonly CategoryId[] = [
  'heart', 'heart', 'heart', 'sleep', 'activity', 'activity', 'meds', 'checkin', 'speech', 'mood', 'home', 'heart',
]

/** The twelve plain-language KPI tiles (`#kpis`, c12); each tile locks on its own category. */
export function KpiRow({ kpis }: { kpis: KpiData[] }) {
  const drawer = useDrawer()
  return (
    <div className="c12 kpis">
      {kpis.map((k, i) => (
        <Locked key={k.label} cat={KPI_CATEGORY[i] ?? 'checkin'}>
          <Kpi
            emoji={k.emoji}
            label={k.label}
            value={k.value}
            unit={k.unit}
            sub={k.baseline}
            delta={k.delta}
            tone={k.tone}
            onOpen={() => drawer.open(`${k.emoji ?? ''}${k.label}`, <KpiDrawerBody kpi={k} />)}
          >
            <Sparkline values={k.spark} color={k.color} decorative />
          </Kpi>
        </Locked>
      ))}
    </div>
  )
}
