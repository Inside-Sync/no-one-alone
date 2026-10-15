import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import { useToast } from '@/components/ui/Toast'
import type { HospitalAction } from '@/data/types'
import { Head } from '../../individual/home/parts'

/** The buttons in the prototype's ONCE table: they lock after a click; "Linked" and "Auto" just toast. */
const LOCKS_AFTER_CLICK: readonly HospitalAction['button'][] = ['Approve', 'Review']

function ActionButton({ action: a }: { action: HospitalAction }) {
  const { t } = useTranslation(['hospital', 'common'])
  const toast = useToast()
  const label = t(`demand.actions.buttons.${a.button}`)
  const message = a.button === 'Approve' ? t('demand.actions.toastApproved', { title: a.title }) : t('demand.actions.toastNoted', { title: a.title })
  const cls = `sm${a.button === 'Approve' ? '' : ' soft'}`
  if (LOCKS_AFTER_CLICK.includes(a.button)) {
    // ONCE labels are keyed by the English button enum in both languages.
    const once = t('common:onceLabels', { returnObjects: true }) as Record<string, string | undefined>
    const done = once[a.button] ?? `✓ ${label}`
    return <OnceButton className={cls} toast={message} done={done}>{label}</OnceButton>
  }
  return <button type="button" className={`btn ${cls}`} onClick={() => toast(message)}>{label}</button>
}

/** `Suggested actions` (c6): the forecast's recommendations, each with its button. */
export function ActionsCard({ actions }: { actions: HospitalAction[] }) {
  const { t } = useTranslation('hospital')
  return (
    <GlassCard span={6}>
      <Head title={t('demand.actions.title')} meta={t('demand.actions.meta')} />
      <ul className="list" id="actionsH">
        {actions.map((a) => (
          <li key={a.title}>
            <span className="li"><span className="ic"><Icon name="hospital" /></span></span>
            <span><b>{a.title}</b><small>{a.note}</small></span>
            <ActionButton action={a} />
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
