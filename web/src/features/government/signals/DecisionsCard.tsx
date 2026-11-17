import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import type { Decision } from '@/data/government.types'
import { Head } from '../../individual/home/parts'

/** `Decisions waiting for you` (c6): suggested changes a person approves once each. */
export function DecisionsCard({ items }: { items: Decision[] }) {
  const { t } = useTranslation('government')
  return (
    <GlassCard span={6} tour="decisions">
      <Head title={t('signals.decisions.title')} meta={t('signals.decisions.meta')} />
      <ul className="list" id="decisions">
        {items.map((i) => (
          <li key={i.title}>
            <span className="li"><span className="ic"><Icon name="check" /></span></span>
            <span><b>{i.title}</b><small>{i.detail}</small></span>
            <OnceButton className="sm" toast={t('signals.decisions.toast')} done={t('signals.decisions.done')}>{t('signals.decisions.approve')}</OnceButton>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
