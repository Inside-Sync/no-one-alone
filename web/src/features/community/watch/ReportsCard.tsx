import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import type { WatchReport } from '@/data/types'
import { CommunityRow } from '../shared'
import { TableScroll } from '@/components/ui/TableScroll'

const plain = { fontWeight: 500 } as const

/** `Neighbourhood watch across the Inner West` (c7): every open report, with type, reach and status. */
export function ReportsCard({ rows }: { rows: WatchReport[] }) {
  const { t } = useTranslation('community')
  const head = t('watch.reports.head', { returnObjects: true })
  return (
    <GlassCard span={7}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="eye" /></span></span>
        <h2>{t('watch.reports.title')}</h2>
        <span className="meta">{t('watch.reports.meta')}</span>
      </div>
      <TableScroll>
        <table>
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="watchRows">
            {rows.map((r) => (
              <CommunityRow
                key={r.title}
                title={r.title}
                details={[
                  [head[0], <b key="t" style={plain}>{r.title}</b>],
                  [head[1], r.suburbs],
                  [head[2], <Pill key="y" tone={r.typeTone}>{r.type}</Pill>],
                  [head[3], r.affected],
                  [head[4], r.since],
                  [head[5], r.status],
                ]}
              >
                <td><b style={plain}>{r.title}</b></td>
                <td style={{ fontSize: '12px' }}>{r.suburbs}</td>
                <td><Pill tone={r.typeTone}>{r.type}</Pill></td>
                <td>{r.affected}</td>
                <td className="n">{r.since}</td>
                <td>{r.status}</td>
              </CommunityRow>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
