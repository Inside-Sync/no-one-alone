import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import type { ClinicSlot, LoopSuggestion } from '@/data/types'
import { Head } from '../../individual/home/parts'

/** Bar colour by how full the clinic is: red from 90%, amber from 75%. */
const fill = (p: number) => (p >= 0.9 ? '#ef4e4a' : p >= 0.75 ? '#c88a05' : '#0b7f71')

/** `Clinic slots this week` (c6): booked of available per clinic, and the two suggested decisions. */
export function SlotsCard({ slots, suggestions }: { slots: ClinicSlot[]; suggestions: LoopSuggestion[] }) {
  const { t } = useTranslation('screening')
  return (
    <GlassCard span={6}>
      <Head title={t('loop.slots.title')} meta={t('loop.slots.meta')} />
      <div className="hbars" id="loopSlots">
        {slots.map((r) => {
          const p = r.booked / r.total
          return (
            <div key={r.label}>
              <span>{r.label}</span>
              <span className="tr">
                <i className="b" style={{ width: '100%' }} />
                <i style={{ width: `${p * 100}%`, background: fill(p), opacity: 0.85, height: 5, top: 3.5 }} />
              </span>
              <b>{t('loop.slots.count', { booked: r.booked, total: r.total })}</b>
            </div>
          )
        })}
      </div>
      <ul className="list" id="loopSug">
        {suggestions.map((a) => (
          <li key={a.title}>
            <span className="li"><span className="ic"><Icon name="spark" /></span></span>
            <span><b>{a.title}</b><small>{a.note}</small></span>
            <OnceButton className="sm" toast={t('loop.slots.toast')} done={t('loop.slots.approved')}>{t('loop.slots.approve')}</OnceButton>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
