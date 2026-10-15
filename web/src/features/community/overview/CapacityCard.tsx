import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { CommunityData } from '@/data/types'
import { Head } from '../../individual/home/parts'

const BAR_SHORT = '#ef4e4a'
const BAR_COVERED = '#0b7f71'

/** `Volunteer capacity vs need` (c4): capacity track with the need bar over it, scaled to the largest value. */
export function CapacityCard({ rows }: { rows: CommunityData['capacity'] }) {
  const { t } = useTranslation('community')
  const legend = t('overview.capacity.legend', { returnObjects: true })
  const max = Math.max(...rows.map((r) => Math.max(r.need, r.capacity)))
  return (
    <GlassCard span={4}>
      <Head title={t('overview.capacity.title')} meta={t('overview.capacity.meta')} />
      <div className="hbars" id="capacity">
        {rows.map((r) => {
          const short = r.need > r.capacity
          return (
            <div key={r.name}>
              <span>{r.name}</span>
              <span className="tr">
                <i className="b" style={{ width: `${(r.capacity / max) * 100}%` }}></i>
                <i style={{ width: `${(r.need / max) * 100}%`, background: short ? BAR_SHORT : BAR_COVERED, opacity: 0.85, height: 5, top: 3.5 }}></i>
              </span>
              <b style={{ color: short ? 'var(--bad-text)' : 'var(--good-text)' }}>{short ? `−${r.need - r.capacity}` : `+${r.capacity - r.need}`}</b>
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
