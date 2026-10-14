import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { RECORD_COPY } from '@/data/repo'
import type { CareRecord } from '@/data/types'
import { ClickRow } from '../ClickRow'
import { TableScroll } from '@/components/ui/TableScroll'

/** `Data sources` (c7): provenance per source, tagged with the FHIR standard. */
export function SourcesCard({ sources, tag }: { sources: CareRecord['sources']; tag: string }) {
  const c = RECORD_COPY.sources
  return (
    <GlassCard span={7}>
      <div className="ch"><h2>{c.title}</h2><span className="tag">{tag}</span><span className="meta">{c.meta}</span></div>
      <TableScroll>
        <table>
          <thead><tr>{c.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="srcs">
            {sources.map((r) => (
              <ClickRow
                key={r.source}
                title={r.source}
                details={[[c.head[0], r.source], [c.head[1], r.standard], [c.head[2], r.records], [c.head[3], r.lastSync], [c.head[4], <Pill key="s" tone={r.tone}>{r.status}</Pill>]]}
              >
                <td>{r.source}</td>
                <td style={{ fontSize: '12px' }}>{r.standard}</td>
                <td className="n">{r.records}</td>
                <td className="n">{r.lastSync}</td>
                <td><Pill tone={r.tone}>{r.status}</Pill></td>
              </ClickRow>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
