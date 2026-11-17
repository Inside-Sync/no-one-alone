import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { FunnelStage } from '@/data/government.types'
import type { MiniStat } from '@/data/types'
import { intlLocale } from '@/i18n'
import { fillForWhiteText } from '@/lib/color'
import { Head } from '../../individual/home/parts'
import { GovernmentMini } from '../shared'

/** Narrowest bar, as a share of the row, so small stages stay readable. */
const MIN_BAR_PERCENT = 12

/** `Screening to care` (c4): each stage as a bar scaled to the first stage, then the three median waits. */
export function FunnelCard({ stages, minis }: { stages: FunnelStage[]; minis: MiniStat[] }) {
  const { t } = useTranslation('government')
  const top = stages[0]?.value || 1
  return (
    <GlassCard span={4}>
      <Head title={t('population.funnel.title')} meta={t('population.funnel.meta')} />
      <div className="funnel" id="funnel">
        {stages.map((f) => (
          <div key={f.label}>
            <span>{f.label}</span>
            <i style={{ width: `${Math.max(MIN_BAR_PERCENT, (f.value / top) * 100)}%`, background: fillForWhiteText(f.color) }}>{f.value.toLocaleString(intlLocale())}</i>
          </div>
        ))}
      </div>
      <GovernmentMini stats={minis} />
    </GlassCard>
  )
}
