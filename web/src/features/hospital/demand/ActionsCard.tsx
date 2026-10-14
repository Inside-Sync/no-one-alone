import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import { useToast } from '@/components/ui/Toast'
import { HOSPITAL_COPY, ONCE_LABELS } from '@/data/repo'
import type { HospitalAction } from '@/data/types'
import { Head } from '../../individual/home/parts'

function ActionButton({ action: a }: { action: HospitalAction }) {
  const toast = useToast()
  const message = `${a.title} · ${a.button === 'Approve' ? 'approved' : 'noted'}`
  const cls = `sm${a.button === 'Approve' ? '' : ' soft'}`
  const done = ONCE_LABELS[a.button]
  // Only the labels in the prototype's ONCE table lock after a click; "Linked" and "Auto" just toast.
  if (done) return <OnceButton className={cls} toast={message} done={done}>{a.button}</OnceButton>
  return <button type="button" className={`btn ${cls}`} onClick={() => toast(message)}>{a.button}</button>
}

/** `Suggested actions` (c6): the forecast's recommendations, each with its button. */
export function ActionsCard({ actions }: { actions: HospitalAction[] }) {
  const c = HOSPITAL_COPY.demand.actions
  return (
    <GlassCard span={6}>
      <Head title={c.title} meta={c.meta} />
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
