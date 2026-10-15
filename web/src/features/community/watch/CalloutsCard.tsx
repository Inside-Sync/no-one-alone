import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import type { Callout } from '@/data/types'
import { Head } from '../../individual/home/parts'

/** `Volunteer call-outs` (c6): open requests a volunteer can accept once. */
export function CalloutsCard({ items }: { items: Callout[] }) {
  const { t } = useTranslation('community')
  return (
    <GlassCard span={6}>
      <Head title={t('watch.callouts.title')} meta={t('watch.callouts.meta')} />
      <ul className="list" id="callouts">
        {items.map((i) => (
          <li key={i.title}>
            <span className="li"><span className="ic"><Icon name="people" /></span></span>
            <span><b>{i.title}</b><small>{i.detail}</small></span>
            <OnceButton className="sm" toast={t('watch.callouts.toast')} done={t('watch.callouts.done')}>{i.button}</OnceButton>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
