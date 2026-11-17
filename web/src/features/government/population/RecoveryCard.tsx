import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { GovernmentData } from '@/data/government.types'
import { toneAt, STATUS_COLOUR } from '../bands'
import { Head } from '../../individual/home/parts'
import s from '../government.module.css'

const NEAR_TARGET = 10

/** Bar colour: at or above target is green, within 10 points amber, further below red. */
function recoveryColour(value: number, target: number): string {
  const tone = toneAt(value, target, target - NEAR_TARGET)
  return tone === 'good' ? STATUS_COLOUR.target : tone === 'warn' ? STATUS_COLOUR.watch : STATUS_COLOUR.below
}

/** `Recovery after care` (c4): two headline figures and one bar per condition with its target line. */
export function RecoveryCard({ recovery }: { recovery: GovernmentData['recovery'] }) {
  const { t } = useTranslation('government')
  return (
    <GlassCard span={4} id="recoveryCard" tour="recovery">
      <Head icon="trend" title={t('population.recovery.title')} meta={t('population.recovery.meta')} />
      <div className={s.rcTop}>
        {recovery.headlines.map((h) => <div key={h.label}><b className="n">{h.value}</b><small>{h.label}</small></div>)}
      </div>
      <ul className={s.rcl}>
        {recovery.rows.map((r) => (
          <li key={r.label}>
            <div><b>{r.label}</b><small>{r.note}</small></div>
            <div className={s.bar}>
              <i role="img" aria-label={`${r.label} ${r.value}% · ${t('population.recovery.target', { value: r.target })}`}>
                <s style={{ width: `${r.value}%`, background: recoveryColour(r.value, r.target) }}></s>
                <u style={{ insetInlineStart: `${r.target}%` }}></u>
              </i>
              <b className="n">{r.value}%</b>
            </div>
          </li>
        ))}
      </ul>
      <p className="fine">{recovery.note}</p>
    </GlassCard>
  )
}
