import { GlassCard } from '@/components/ui/GlassCard'
import { useTranslation } from 'react-i18next'
import type { CareRecord } from '@/data/types'
import { Head } from '../home/parts'

/** `After a hospital stay` (c5): the 30-day follow-up plan. */
export function FollowUpCard({ days, note }: { days: CareRecord['followUp']; note: string }) {
  const { t } = useTranslation('record')
  return (
    <GlassCard span={5}>
      <Head title={t('followUp.title')} meta={t('followUp.meta')} />
      <div className="days">{days.map((d) => <div key={d.day}><b>{d.day}</b>{d.text}</div>)}</div>
      <p className="fine">{note}</p>
    </GlassCard>
  )
}
