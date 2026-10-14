import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import { COMMUNITY_COPY } from '@/data/repo'
import type { Callout } from '@/data/types'
import { Head } from '../../individual/home/parts'

/** `Volunteer call-outs` (c6): open requests a volunteer can accept once. */
export function CalloutsCard({ items }: { items: Callout[] }) {
  const c = COMMUNITY_COPY.watch.callouts
  return (
    <GlassCard span={6}>
      <Head title={c.title} meta={c.meta} />
      <ul className="list" id="callouts">
        {items.map((i) => (
          <li key={i.title}>
            <span className="li"><span className="ic"><Icon name="people" /></span></span>
            <span><b>{i.title}</b><small>{i.detail}</small></span>
            <OnceButton className="sm" toast={c.toast} done={c.done}>{i.button}</OnceButton>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
