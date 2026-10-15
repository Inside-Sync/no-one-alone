import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { useTranslation } from 'react-i18next'
import type { RiskRow } from '@/data/types'
import { Head } from '../home/parts'
import { TableScroll } from '@/components/ui/TableScroll'

const trendColour = (t: RiskRow['trend']) => (t === '↑' ? 'var(--bad-text)' : t === '↓' ? 'var(--good-text)' : 'var(--muted-text)')

/** `📊 Chances over time` (c7): `#riskRows`. */
export function RisksCard({ risks }: { risks: RiskRow[] }) {
  const { t } = useTranslation('forecast')
  const columns = t('risks.columns', { returnObjects: true })
  return (
    <GlassCard span={7}>
      <Head title={t('risks.title')} meta={t('risks.meta')} />
      <TableScroll>
        <table>
          <thead><tr>{columns.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="riskRows">
            {risks.map((r) => (
              <tr key={r.name}>
                <td><b style={{ fontWeight: 500 }}>{r.name}</b></td>
                <td className="n">{r.nextMonth}</td>
                <td className="n"><b>{r.threeMonths}</b></td>
                <td className="n">{r.nextYear}</td>
                <td className="n">{r.range}</td>
                <td><Pill tone={r.tone}>{r.level}</Pill></td>
                <td className="n" style={{ color: trendColour(r.trend) }}>{r.trend}</td>
                <td>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
