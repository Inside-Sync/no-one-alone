import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { OnceButton } from '@/components/ui/OnceButton'
import { Pill } from '@/components/ui/Pill'
import type { VisitRow } from '@/data/types'
import { rankVisits } from '@/domain/district'
import { Head } from '../../individual/home/parts'
import { CommunityRow } from '../shared'
import { TableScroll } from '@/components/ui/TableScroll'

const plain = { fontWeight: 500 } as const

/** `Who needs a visit this week` (c8): ranked by risk, with the person's language and nearest help. */
export function VisitsCard({ rows }: { rows: VisitRow[] }) {
  const { t } = useTranslation('community')
  const head = t('overview.visits.head', { returnObjects: true })
  return (
    <GlassCard span={8}>
      <Head title={t('overview.visits.title')} meta={t('overview.visits.meta')} />
      <TableScroll>
        <table>
          <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody id="visits">
            {rankVisits(rows).map((r) => {
              const who = <><b style={plain}>{r.name}</b><small>{r.age}</small></>
              return (
                <CommunityRow
                  key={r.name}
                  title={r.name}
                  details={[
                    [head[0], who],
                    [head[1], r.suburb],
                    [head[2], <Pill key="r" tone={r.tone}>{r.risk}</Pill>],
                    [head[3], r.reason],
                    [head[4], r.language],
                    [head[5], r.nearestHelp],
                  ]}
                >
                  <td>{who}</td>
                  <td>{r.suburb}</td>
                  <td><Pill tone={r.tone}>{r.risk}</Pill></td>
                  <td>{r.reason}</td>
                  <td>{r.language}</td>
                  <td style={{ fontSize: '12px' }}>{r.nearestHelp}</td>
                  <td><OnceButton className="sm soft" toast={t('overview.visits.toast', { name: r.name })} done={t('overview.visits.planned')}>{t('overview.visits.plan')}</OnceButton></td>
                </CommunityRow>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
