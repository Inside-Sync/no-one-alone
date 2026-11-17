import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import type { GovernmentData } from '@/data/government.types'
import { toneVar } from '@/lib/tone'
import { Head } from '../../individual/home/parts'
import { capacityBand } from '../bands'
import s from '../government.module.css'

/** `Where capacity is out of balance` (c5): how many facilities are over, right and under, two to look at, one action. */
export function BalanceCard({ facilities, balance }: { facilities: GovernmentData['facilities']; balance: GovernmentData['balance'] }) {
  const { t } = useTranslation('government')
  const count = (band: 'over' | 'right' | 'under') => facilities.rows.filter((f) => capacityBand(f.capacity) === band).length
  return (
    <GlassCard span={5} id="capSum">
      <Head title={t('population.balance.title')} meta={t('population.balance.meta')} />
      <div className={s.capsum}>
        <div><b style={{ color: toneVar('bad') }}>{count('over')}</b><small>{t('population.balance.over')}</small></div>
        <div><b style={{ color: toneVar('good') }}>{count('right')}</b><small>{t('population.balance.right')}</small></div>
        <div><b>{count('under')}</b><small>{t('population.balance.under')}</small></div>
      </div>
      <ul className="list">
        {balance.items.map((i) => (
          <li key={i.title}>
            <span className="li" style={{ color: toneVar(i.tone) }}><span className="ic"><Icon name={i.icon} /></span></span>
            <span><b>{i.title}</b><small>{i.detail}</small></span>
          </li>
        ))}
      </ul>
      <OnceButton toast={balance.overflowToast} done={t('population.balance.sent')}>{t('population.balance.send')}</OnceButton>
    </GlassCard>
  )
}
