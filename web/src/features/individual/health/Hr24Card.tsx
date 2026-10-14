'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Locked } from '@/components/ui/Locked'
import { HEALTH_COPY } from '@/data/repo'
import type { Hr24 } from '@/data/types'
import { Head } from '../home/parts'
import { Hr24Chart } from './Hr24Chart'
import { Legend } from './Legend'

/** `❤️ Heartbeat over the last day` (c8, heart category). */
export function Hr24Card({ hr }: { hr: Hr24 }) {
  const c = HEALTH_COPY.hr
  return (
    <Locked cat="heart" span={8}>
      <GlassCard span={8} className="chart">
        <Head title={c.title} meta={c.meta} />
        <div id="hr24"><Hr24Chart hr={hr} ariaLabel={c.ariaLabel} asleepLabel={c.asleep} /></div>
        <Legend items={c.legend} />
      </GlassCard>
    </Locked>
  )
}
