import { GlassCard } from '@/components/ui/GlassCard'
import { COMMUNITY_COPY } from '@/data/repo'
import type { FunnelStage, MiniStat } from '@/data/types'
import { fillForWhiteText } from '@/lib/color'
import { Head } from '../../individual/home/parts'
import { CommunityMini } from '../shared'

/** Narrowest bar, as a share of the row, so small stages stay readable. */
const MIN_BAR_PERCENT = 12

/** `Alert funnel` (c4): each stage as a bar scaled to the first stage. */
export function FunnelCard({ stages, minis }: { stages: FunnelStage[]; minis: MiniStat[] }) {
  const c = COMMUNITY_COPY.overview.funnel
  const top = stages[0]?.value || 1
  return (
    <GlassCard span={4}>
      <Head title={c.title} meta={c.meta} />
      <div className="funnel" id="funnel">
        {stages.map((f) => (
          <div key={f.label}>
            <span>{f.label}</span>
            <i style={{ width: `${Math.max(MIN_BAR_PERCENT, (f.value / top) * 100)}%`, background: fillForWhiteText(f.color) }}>{f.value}</i>
          </div>
        ))}
      </div>
      <CommunityMini stats={minis} />
    </GlassCard>
  )
}
