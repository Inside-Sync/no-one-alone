import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Suppressed, SuppressionNote } from '@/components/ui/Suppressed'
import { Pill } from '@/components/ui/Pill'
import { TableScroll } from '@/components/ui/TableScroll'
import type { SignalRow } from '@/data/government.types'
import { isSuppressed, leadingCount } from '@/domain/suppression'
import { GovernmentRow } from '../shared'

const plain = { fontWeight: 500 } as const

/** "8 cases" becomes "<10 cases" when the people or cases it counts are under 10. */
function affectedCell(text: string) {
  const n = leadingCount(text)
  if (n === null || !isSuppressed(n)) return text
  return <><Suppressed />{text.replace(/^\s*\d[\d,]*/, '')}</>
}

/** `Signals across Abu Dhabi` (c7): every open signal, with the areas it touches, its type, reach and status. */
export function SignalsTableCard({ rows }: { rows: SignalRow[] }) {
  const { t } = useTranslation('government')
  const head = t('signals.table.head', { returnObjects: true })
  return (
    <GlassCard span={7}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="eye" /></span></span>
        <h2>{t('signals.table.title')}</h2>
        <span className="meta">{t('signals.table.meta')}</span>
      </div>
      <TableScroll>
        <table>
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="watchRows">
            {rows.map((r) => (
              <GovernmentRow
                key={r.title}
                title={r.title}
                details={[
                  [head[0], <b key="t" style={plain}>{r.title}</b>],
                  [head[1], r.areas],
                  [head[2], r.type],
                  [head[3], affectedCell(r.affected)],
                  [head[4], r.since],
                  [head[5], <Pill key="s" tone={r.tone}>{r.status}</Pill>],
                ]}
              >
                <td><b style={plain}>{r.title}</b></td>
                <td style={{ fontSize: '12px' }}>{r.areas}</td>
                <td>{r.type}</td>
                <td>{affectedCell(r.affected)}</td>
                <td className="n">{r.since}</td>
                <td><Pill tone={r.tone}>{r.status}</Pill></td>
              </GovernmentRow>
            ))}
          </tbody>
        </table>
      </TableScroll>
      {rows.some((r) => { const n = leadingCount(r.affected); return n !== null && isSuppressed(n) }) && <SuppressionNote />}
    </GlassCard>
  )
}
