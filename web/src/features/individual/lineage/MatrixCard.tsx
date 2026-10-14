import { GlassCard } from '@/components/ui/GlassCard'
import { LINEAGE_COPY } from '@/data/repo'
import type { Lineage } from '@/data/types'
import { Head } from '../home/parts'

/** `Condition matrix` (c7): age at onset per relative; blank cells use the track colour. */
export function MatrixCard({ lineage }: { lineage: Lineage }) {
  const keys = lineage.conditionKeys
  const c = LINEAGE_COPY.matrix
  return (
    <GlassCard span={7}>
      <Head title={c.title} meta={c.meta} />
      <div className="tw">
        <table className="mx" id="mx">
          <thead>
            <tr><th>{c.person}</th>{lineage.matrixColumns.map((k) => <th key={k}>{keys[k].name}</th>)}</tr>
          </thead>
          <tbody>
            {lineage.matrix.map((r) => (
              <tr key={r.person}>
                <td>{r.person}</td>
                {lineage.matrixColumns.map((k) => {
                  const v = r.onset[k]
                  return v != null
                    ? <td key={k} style={{ background: keys[k].color, color: '#fff', fontWeight: 600 }}>{v}</td>
                    : <td key={k} style={{ background: 'var(--track)' }}></td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
