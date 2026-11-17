import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { ReferralNeed } from '@/data/government.types'
import { Head } from '../../individual/home/parts'

const BAR_SHORT = '#ef4e4a'
const BAR_COVERED = '#0b7f71'

/** `Referral capacity vs need` (c4): slots a week with the need drawn over them, scaled to the largest value. */
export function ReferralsCard({ rows }: { rows: ReferralNeed[] }) {
  const { t } = useTranslation('government')
  const legend = t('population.referrals.legend', { returnObjects: true })
  const max = Math.max(...rows.map((r) => Math.max(r.need, r.slots)))
  return (
    <GlassCard span={4}>
      <Head title={t('population.referrals.title')} meta={t('population.referrals.meta')} />
      <div className="hbars" id="capacity">
        {rows.map((r) => {
          const short = r.need > r.slots
          return (
            <div key={r.name}>
              <span>{r.name}</span>
              <span className="tr">
                <i className="b" style={{ width: `${(r.slots / max) * 100}%` }}></i>
                <i style={{ width: `${(r.need / max) * 100}%`, background: short ? BAR_SHORT : BAR_COVERED, opacity: 0.85, height: 5, top: 3.5 }}></i>
              </span>
              <b style={{ color: short ? 'var(--bad-text)' : 'var(--good-text)' }}>{short ? `−${r.need - r.slots}` : `+${r.slots - r.need}`}</b>
            </div>
          )
        })}
      </div>
      <div className="legend">
        {legend.map((l) => <span key={l.label}><i style={{ background: l.color }}></i>{l.label}</span>)}
      </div>
    </GlassCard>
  )
}
