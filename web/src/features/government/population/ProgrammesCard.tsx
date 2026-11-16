import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { TableScroll } from '@/components/ui/TableScroll'
import type { ProgrammeRow } from '@/data/government.types'
import { Head } from '../../individual/home/parts'
import { GovernmentRow } from '../shared'

/** `Programmes and outcomes` (c6): tests, in care in time and the outcome at 3 months of each screening programme. */
export function ProgrammesCard({ rows }: { rows: ProgrammeRow[] }) {
  const { t } = useTranslation('government')
  const head = t('population.programmes.head', { returnObjects: true })
  return (
    <GlassCard span={6}>
      <Head title={t('population.programmes.title')} meta={t('population.programmes.meta')} />
      <TableScroll>
        <table style={{ minWidth: 0 }}>
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="progs">
            {rows.map((p) => (
              <GovernmentRow
                key={p.programme}
                title={p.programme}
                details={[[head[0], p.programme], [head[1], p.tests], [head[2], p.inCare], [head[3], p.outcome]]}
              >
                <td>{p.programme}</td>
                <td className="n">{p.tests}</td>
                <td className="n">{p.inCare}</td>
                <td style={{ fontSize: '12px' }}>{p.outcome}</td>
              </GovernmentRow>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
