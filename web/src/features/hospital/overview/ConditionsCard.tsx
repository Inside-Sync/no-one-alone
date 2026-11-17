import { useTranslation } from 'react-i18next'
import { CardHeader } from '@/components/ui/CardHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { TableScroll } from '@/components/ui/TableScroll'
import type { OverviewCondition } from '@/data/types'
import { outcomeColour } from './bands'
import { HpBar } from './HpBar'
import './overview.css'

const plain = { fontWeight: 500 } as const

/** `By condition` (c12): treated in time, recovered at 90 days and readmitted in 30 days, per condition. */
export function ConditionsCard({ rows }: { rows: OverviewCondition[] }) {
  const { t } = useTranslation('overview')
  const head = t('conditions.head', { returnObjects: true }) as string[]
  return (
    <GlassCard span={12}>
      <CardHeader icon="trend" title={t('conditions.title')} meta={t('conditions.meta')} />
      <TableScroll>
        <table>
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="conRows">
            {rows.map((c) => (
              <tr key={c.name}>
                <td><b style={plain}>{c.name}</b></td>
                <td className="n">{c.patients}</td>
                <td>
                  <HpBar pct={c.inTime.pct} colour={outcomeColour(c.inTime.pct, 85, 75)} value={`${c.inTime.pct}%`} />
                  <small className="hp-note">{c.inTime.note}</small>
                </td>
                <td>
                  <HpBar pct={c.recovered.pct} colour={outcomeColour(c.recovered.pct, 75, 60)} value={`${c.recovered.pct}%`} />
                  <small className="hp-note">{c.recovered.note}</small>
                </td>
                <td className="n">{c.readmitted ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <p className="fine">{t('conditions.note')}</p>
    </GlassCard>
  )
}
