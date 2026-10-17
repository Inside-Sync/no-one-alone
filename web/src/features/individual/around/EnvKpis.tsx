'use client'

import { Sparkline } from '@/components/charts/Sparkline'
import { useDrawer } from '@/components/ui/Drawer'
import { Kpi } from '@/components/ui/Kpi'
import type { Kpi as KpiData } from '@/data/types'
import { KpiDrawerBody } from '../home/drawers'

/** `#envKpis` (c12): twelve plain-language environment tiles. */
export function EnvKpis({ kpis }: { kpis: KpiData[] }) {
  const drawer = useDrawer()
  return (
    <div className="c12 kpis">
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
