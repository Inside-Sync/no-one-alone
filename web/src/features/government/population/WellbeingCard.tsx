import { useTranslation } from 'react-i18next'
import { Sparkline } from '@/components/charts/Sparkline'
import { GlassCard } from '@/components/ui/GlassCard'
import type { WellbeingTile } from '@/data/government.types'
import { toneVar } from '@/lib/tone'
import { Head } from '../../individual/home/parts'
import s from '../government.module.css'

const SPARK = { good: '#1f9d57', warn: '#c88a05', bad: '#d9443f' } as const

/** `Health and wellbeing` (c8): eight population measures, each with its yearly trend, change and target note. */
export function WellbeingCard({ tiles }: { tiles: WellbeingTile[] }) {
  const { t } = useTranslation('government')
  return (
    <GlassCard span={8} id="wellbeing" className={s.fill} tour="wellbeing">
      <Head icon="heart" title={t('population.wellbeing.title')} meta={t('population.wellbeing.meta')} />
      <div className={s.wb}>
        {tiles.map((w) => (
          <div key={w.label} className={s.wbt}>
            <small>{w.label}</small>
            <div className={s.wbv}><b className="n">{w.value}</b><span>{w.unit}</span></div>
            <div className={s.wbs}><Sparkline values={w.spark} color={SPARK[w.tone]} decorative /></div>
            <div className={s.wbf}><em style={{ color: toneVar(w.tone) }}>{w.delta}</em><span>{w.note}</span></div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
