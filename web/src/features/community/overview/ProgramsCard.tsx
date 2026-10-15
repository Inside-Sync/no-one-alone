import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { ProgramRow } from '@/data/types'
import { Head } from '../../individual/home/parts'
import { CommunityRow } from '../shared'
import { TableScroll } from '@/components/ui/TableScroll'

/** `Programs and outcomes` (c6): twelve-week view of each community program. */
export function ProgramsCard({ rows }: { rows: ProgramRow[] }) {
  const { t } = useTranslation('community')
  const head = t('overview.programs.head', { returnObjects: true })
  return (
    <GlassCard span={6}>
      <Head title={t('overview.programs.title')} meta={t('overview.programs.meta')} />
      <TableScroll>
        <table style={{ minWidth: 0 }}>
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="progs">
            {rows.map((p) => (
              <CommunityRow
                key={p.program}
                title={p.program}
                details={[[head[0], p.program], [head[1], String(p.regulars)], [head[2], p.attendance], [head[3], p.outcome]]}
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
