import { GlassCard } from '@/components/ui/GlassCard'
import { LINEAGE_COPY } from '@/data/repo'
import type { StrengthRow } from '@/data/types'
import { Head } from '../home/parts'

/** `Family pattern strength for you, James` (right column of the pedigree row). */
export function StrengthCard({ heading, rows, note }: { heading: string; rows: StrengthRow[]; note: string }) {
  return (
    <GlassCard>
      <Head title={heading} meta={LINEAGE_COPY.strengthMeta} />
      <div className="strength" id="strength">
        {rows.map((s) => (
          <div key={s.condition}>
            <span>{s.condition}</span>
            <span className="dots">{[0, 1, 2, 3].map((i) => <i key={i} className={i < s.dots ? 'on' : ''}></i>)}</span>
            <span className="mono" style={{ fontSize: '11.5px' }}>{s.label}</span>
          </div>
        ))}
      </div>
      <p className="fine">{note}</p>
    </GlassCard>
  )
}
