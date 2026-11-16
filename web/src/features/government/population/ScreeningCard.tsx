import { useTranslation } from 'react-i18next'
import { Bars } from '@/components/charts/Bars'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import { Pill } from '@/components/ui/Pill'
import type { GovernmentData } from '@/data/government.types'
import { GovernmentMini } from '../shared'

/** `Screening this quarter` (c4): weekly screenings against the 210 slots, three stats, three campaigns and one action. */
export function ScreeningCard({ screening }: { screening: GovernmentData['screening'] }) {
  const { t } = useTranslation('government')
  const { slots } = screening
  return (
    <GlassCard span={4}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="target" /></span></span>
        <h2>{t('population.screening.title')}</h2>
        <Pill tone="warn">{screening.pill}</Pill>
      </div>
      <div id="screeningWeeks">
        <Bars values={screening.weeks.map((w) => w.value)} labels={screening.weeks.map((w) => w.label)} goal={{ value: slots.value, label: slots.label }} max={slots.max} />
      </div>
      <GovernmentMini stats={screening.stats} />
      <ul className="list">
        {screening.campaigns.map((c) => (
          <li key={c.title}>
            <span className="li"><span className="ic"><Icon name="clinic" /></span></span>
            <span><b>{c.title}</b><small>{c.detail}</small></span>
            <Pill tone={c.pill.tone}>{c.pill.text}</Pill>
          </li>
        ))}
      </ul>
      <OnceButton toast={screening.approveToast} done={t('population.screening.approved')}>{t('population.screening.approve')}</OnceButton>
    </GlassCard>
  )
}
