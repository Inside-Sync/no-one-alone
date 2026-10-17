'use client'

import { Sparkline } from '@/components/charts/Sparkline'
import { useDrawer } from '@/components/ui/Drawer'
import { Kpi } from '@/components/ui/Kpi'
import type { Kpi as KpiData } from '@/data/types'
import { KpiDrawerBody } from '../home/drawers'

/** `#recKpis` (c12): the six plain-language record tiles (prototype line 1789 override). */
export function RecordKpis({ kpis }: { kpis: KpiData[] }) {
  const drawer = useDrawer()
  return (
    <div className="c12 kpis" id="recKpis">
      {kpis.map((k) => (
        <Kpi
          key={k.label}
          icon={k.icon}
          label={k.label}
          value={k.value}
          unit={k.unit}
          sub={k.baseline}
          delta={k.delta}
          tone={k.tone}
          onOpen={() => drawer.open(k.label, <KpiDrawerBody kpi={k} />)}
        >
          <Sparkline values={k.spark} color={k.color} decorative />
        </Kpi>
      ))}
    </div>
  )
}
