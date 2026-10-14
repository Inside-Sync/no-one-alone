import { GlassCard } from '@/components/ui/GlassCard'
import { RECORD_COPY } from '@/data/repo'
import type { LabRow } from '@/data/types'
import { Head } from '../home/parts'

/** One `.lab` mini (prototype line 1507): last four results, reference range shaded, colour by the latest. */
function Lab({ lab }: { lab: LabRow }) {
  const [lo, hi] = lab.axis
  const y = (v: number) => 36 - ((v - lo) / (hi - lo)) * 32
  const xs = (i: number) => 6 + i * 29
  const r0 = Math.max(lab.reference[0], lo)
  const r1 = Math.min(lab.reference[1], hi)
  const last = lab.values[3]
  const ok = last >= lab.reference[0] && last <= lab.reference[1]
  const stroke = ok ? '#0b7f71' : '#c88a05'
  const d = lab.values.map((v, i) => `${i ? 'L' : 'M'}${xs(i)} ${y(v).toFixed(1)}`).join(' ')
  return (
    <div className="lab">
      <span className="t"><span>{lab.name}</span><span className="mono">{lab.unit}</span></span>
      <b style={{ color: ok ? 'inherit' : 'var(--warn-text)' }}>{last}</b>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none">
        <rect x="0" y={y(r1)} width="100" height={y(r0) - y(r1)} fill="rgba(31,179,156,.14)" />
        <path d={d} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {lab.values.map((v, i) => <circle key={i} cx={xs(i)} cy={y(v).toFixed(1)} r="2.2" fill={stroke} />)}
      </svg>
      <span className="fine">{lab.note}</span>
    </div>
  )
}

/** `Pathology trends` (c6). */
export function LabsCard({ labs }: { labs: LabRow[] }) {
  return (
    <GlassCard span={6}>
      <Head title={RECORD_COPY.labs.title} meta={RECORD_COPY.labs.meta} />
      <div className="labs" id="labs">{labs.map((l) => <Lab key={l.name} lab={l} />)}</div>
    </GlassCard>
  )
}
