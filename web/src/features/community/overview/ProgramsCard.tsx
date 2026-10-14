import { GlassCard } from '@/components/ui/GlassCard'
import { COMMUNITY_COPY } from '@/data/repo'
import type { ProgramRow } from '@/data/types'
import { Head } from '../../individual/home/parts'
import { CommunityRow } from '../shared'
import { TableScroll } from '@/components/ui/TableScroll'

/** `Programs and outcomes` (c6): twelve-week view of each community program. */
export function ProgramsCard({ rows }: { rows: ProgramRow[] }) {
  const c = COMMUNITY_COPY.overview.programs
  return (
    <GlassCard span={6}>
      <Head title={c.title} meta={c.meta} />
      <TableScroll>
        <table style={{ minWidth: 0 }}>
          <thead><tr>{c.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="progs">
            {rows.map((p) => (
              <CommunityRow
                key={p.program}
                title={p.program}
                details={[[c.head[0], p.program], [c.head[1], String(p.regulars)], [c.head[2], p.attendance], [c.head[3], p.outcome]]}
              >
                <td>{p.program}</td>
                <td className="n">{p.regulars}</td>
                <td className="n">{p.attendance}</td>
                <td style={{ fontSize: '12px' }}>{p.outcome}</td>
              </CommunityRow>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
