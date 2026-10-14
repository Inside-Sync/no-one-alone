import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { COMMUNITY_COPY } from '@/data/repo'
import type { WatchReport } from '@/data/types'
import { CommunityRow } from '../shared'

const plain = { fontWeight: 500 } as const

/** `Neighbourhood watch across the Inner West` (c7): every open report, with type, reach and status. */
export function ReportsCard({ rows }: { rows: WatchReport[] }) {
  const c = COMMUNITY_COPY.watch.reports
  return (
    <GlassCard span={7}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="eye" /></span></span>
        <h2>{c.title}</h2>
        <span className="meta">{c.meta}</span>
      </div>
      <div className="tw">
        <table>
          <thead><tr>{c.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="watchRows">
            {rows.map((r) => (
              <CommunityRow
                key={r.title}
                title={r.title}
                details={[
                  [c.head[0], <b key="t" style={plain}>{r.title}</b>],
                  [c.head[1], r.suburbs],
                  [c.head[2], <Pill key="y" tone={r.typeTone}>{r.type}</Pill>],
                  [c.head[3], r.affected],
                  [c.head[4], r.since],
                  [c.head[5], r.status],
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
      </div>
    </GlassCard>
  )
}
