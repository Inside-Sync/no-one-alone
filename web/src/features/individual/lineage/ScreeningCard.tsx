'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { OnceButton } from '@/components/ui/OnceButton'
import { Pill } from '@/components/ui/Pill'
import { LINEAGE_COPY } from '@/data/repo'
import type { Lineage } from '@/data/types'
import { ClickRow } from '../ClickRow'
import { Head } from '../home/parts'
import { TableScroll } from '@/components/ui/TableScroll'

/** `Your screening plan`: the Book buttons are one-shot (`ONCE`: "Book" and "Book GP" become "✓ Requested"). */
export function ScreeningCard({ lineage }: { lineage: Lineage }) {
  const head = LINEAGE_COPY.screeningHead
  return (
    <GlassCard>
      <Head title={lineage.screeningHeading.title} meta={lineage.screeningHeading.meta} />
      <TableScroll>
        <table style={{ minWidth: 0 }}>
          <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody id="screen">
            {lineage.screening.map((r) => (
              <ClickRow
                key={r.check}
                title={r.check}
                details={[[head[0], r.check], [head[1], r.interval], [head[2], <Pill key="d" tone={r.tone}>{r.due}</Pill>]]}
              >
                <td>{r.check}</td>
                <td className="n">{r.interval}</td>
                <td><Pill tone={r.tone}>{r.due}</Pill></td>
                <td>
                  {r.action && <OnceButton className="sm soft" toast={lineage.screeningToast} done="✓ Requested">{r.action}</OnceButton>}
                </td>
              </ClickRow>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
