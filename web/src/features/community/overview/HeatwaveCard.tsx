import { Bars } from '@/components/charts/Bars'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import { Pill } from '@/components/ui/Pill'
import { COMMUNITY_COPY } from '@/data/repo'
import type { CommunityData } from '@/data/types'
import { CommunityMini } from '../shared'

/** `Heatwave plan` (c4): temperature week, check-in numbers, cool-room capacity. */
export function HeatwaveCard({ plan }: { plan: CommunityData['heatwave'] }) {
  const c = COMMUNITY_COPY.overview.heatwave
  const t = plan.tempsThreshold
  return (
    <GlassCard span={4}>
      <div className="ch">
        <span className="li" style={{ color: 'var(--sun-ink)' }}><span className="ic"><Icon name="sun" /></span></span>
        <h2>{c.title}</h2>
        <Pill tone="bad">{plan.pill}</Pill>
      </div>
      <div id="temps">
        <Bars values={plan.temps.map((d) => d.value)} labels={plan.temps.map((d) => d.day)} goal={{ value: t.value, label: t.label }} max={t.max} unit={t.unit} />
      </div>
      <CommunityMini stats={plan.stats} />
      <ul className="list">
        {plan.coolRooms.map((r) => (
          <li key={r.name}>
            <span className="li"><span className="ic"><Icon name="clinic" /></span></span>
            <span><b>{r.name}</b><small>{r.detail}</small></span>
            <Pill tone={r.tone}>{r.left}</Pill>
          </li>
        ))}
      </ul>
      <OnceButton toast={plan.scheduleToast} done={c.scheduled}>{c.schedule}</OnceButton>
    </GlassCard>
  )
}
