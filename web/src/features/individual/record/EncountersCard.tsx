import { GlassCard } from '@/components/ui/GlassCard'
import { RECORD_COPY } from '@/data/repo'
import type { CareRecord } from '@/data/types'
import { Head } from '../home/parts'

const L = 90, R = 740, Y0 = 18
const x = (m: number) => L + (m / 46) * (R - L)

/** `#enc` (prototype lines 1498–1505): one dot per encounter on five swim lanes, 2023–2026. */
function EncounterChart({ enc }: { enc: CareRecord['encounters'] }) {
  const c = RECORD_COPY.enc
  return (
    <svg viewBox="0 0 760 156" role="img" aria-label={c.ariaLabel}>
      {[0, 1, 2, 3].map((yr) => (
        <g key={yr}>
          <line x1={x(yr * 12)} x2={x(yr * 12)} y1="6" y2="140" stroke="rgba(13,42,42,.1)" />
          <text x={x(yr * 12) + 4} y="150">{2023 + yr}</text>
        </g>
      ))}
      <line x1={x(enc.now)} x2={x(enc.now)} y1="6" y2="140" stroke="#ef4e4a" strokeDasharray="3 3" />
      <text x={x(enc.now) - 4} y="150" textAnchor="end" style={{ fill: '#ef4e4a' }}>{c.now}</text>
      {enc.types.map((t, i) => {
        const yy = Y0 + i * 26
        return (
          <g key={t.type}>
            <text x="0" y={yy + 4} style={{ fontFamily: 'var(--font)', fontSize: '11px', fill: 'var(--ink2)' }}>{t.type}</text>
            <line x1={L} x2={R} y1={yy} y2={yy} stroke="rgba(13,42,42,.06)" />
            {t.months.map((m, j) => (
              <circle key={j} cx={x(m).toFixed(1)} cy={yy} r={t.type === 'Emergency' ? 6 : 4.5} fill={t.color} stroke="#fff" strokeWidth="1.2">
                <title>{t.type}</title>
              </circle>
            ))}
          </g>
        )
      })}
      {enc.markers.map((m) => (
        <text key={m.label} x={x(m.month)} y={Y0 + 3 * 26 - 10} textAnchor="middle" style={{ fill: '#ef4e4a' }}>{m.label}</text>
      ))}
    </svg>
  )
}

/** `Encounters, 2023–2026` (c8). */
export function EncountersCard({ enc }: { enc: CareRecord['encounters'] }) {
  return (
    <GlassCard span={8} className="enc">
      <Head title={RECORD_COPY.enc.title} meta={enc.meta} />
      <div id="enc"><EncounterChart enc={enc} /></div>
      <div className="legend">
        {enc.types.map((t) => <span key={t.type}><i style={{ background: t.color, borderRadius: '50%' }}></i>{t.type}</span>)}
      </div>
    </GlassCard>
  )
}
