import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { OnceButton } from '@/components/ui/OnceButton'
import { Pill } from '@/components/ui/Pill'
import { TableScroll } from '@/components/ui/TableScroll'
import type { StalledResult } from '@/data/government.types'
import { longestOpenFirst } from '@/domain/district'
import { Head } from '../../individual/home/parts'
import { GovernmentRow } from '../shared'

const plain = { fontWeight: 500 } as const
/** A result open longer than this is red, longer than the second amber. */
const RED_DAYS = 30, AMBER_DAYS = 14

/** `Results open past target` (c8): longest open first, with why each stalled and the next step. */
export function StalledCard({ rows }: { rows: StalledResult[] }) {
  const { t } = useTranslation('government')
  const head = t('population.stalled.head', { returnObjects: true })
  return (
    <GlassCard span={8}>
      <Head title={t('population.stalled.title')} meta={t('population.stalled.meta')} />
      <TableScroll>
        <table>
          <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody id="stalled">
            {longestOpenFirst(rows).map((r) => {
              const who = <><b style={plain}>{r.name}</b><small>{r.age}</small></>
              const tone = r.openDays > RED_DAYS ? 'bad' : r.openDays > AMBER_DAYS ? 'warn' : 'plain'
              const open = t('population.stalled.days', { n: r.openDays })
              return (
                <GovernmentRow
                  key={r.name}
                  title={r.name}
                  details={[
                    [head[0], who],
                    [head[1], r.area],
                    [head[2], r.result],
                    [head[3], <Pill key="o" tone={tone}>{open}</Pill>],
                    [head[4], r.why],
                    [head[5], r.language],
                    [head[6], r.next],
                  ]}
                >
                  <td>{who}</td>
                  <td>{r.area}</td>
                  <td>{r.result}</td>
                  <td><Pill tone={tone}>{open}</Pill></td>
                  <td>{r.why}</td>
                  <td>{r.language}</td>
                  <td style={{ fontSize: '12px' }}>{r.next}</td>
                  <td><OnceButton className="sm soft" toast={t('population.stalled.toast', { name: r.name })} done={t('population.stalled.assigned')}>{t('population.stalled.assign')}</OnceButton></td>
                </GovernmentRow>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
