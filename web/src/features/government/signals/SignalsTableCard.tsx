import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { TableScroll } from '@/components/ui/TableScroll'
import type { SignalRow } from '@/data/government.types'
import { GovernmentRow } from '../shared'

const plain = { fontWeight: 500 } as const

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
                  [head[3], r.affected],
                  [head[4], r.since],
                  [head[5], <Pill key="s" tone={r.tone}>{r.status}</Pill>],
                ]}
              >
                <td><b style={plain}>{r.title}</b></td>
                <td style={{ fontSize: '12px' }}>{r.areas}</td>
                <td>{r.type}</td>
                <td>{r.affected}</td>
                <td className="n">{r.since}</td>
                <td><Pill tone={r.tone}>{r.status}</Pill></td>
              </GovernmentRow>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
