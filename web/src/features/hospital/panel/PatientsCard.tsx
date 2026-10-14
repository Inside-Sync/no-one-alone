import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { HOSPITAL_COPY } from '@/data/repo'
import type { PanelRow } from '@/data/types'
import { Head } from '../../individual/home/parts'
import { HospitalRow } from '../shared'
import { TableScroll } from '@/components/ui/TableScroll'

const plain = { fontWeight: 500 } as const
const riskOf = (r: PanelRow) => parseFloat(r.risk)

/** `Older patients in the catchment` (c8): ranked by 30-day admission risk, highest first. */
export function PatientsCard({ rows }: { rows: PanelRow[] }) {
  const c = HOSPITAL_COPY.panel.table
  const ranked = [...rows].sort((a, b) => riskOf(b) - riskOf(a))
  return (
    <GlassCard span={8}>
      <Head title={c.title} meta={c.meta} />
      <TableScroll>
        <table>
          <thead><tr>{c.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="panelRows">
            {ranked.map((r) => {
              const who = <><b style={plain}>{r.name}</b><small>{r.age} · {r.sex}</small></>
              return (
                <HospitalRow
                  key={r.name}
                  title={r.name}
                  details={[
                    [c.head[0], who],
                    [c.head[1], r.suburb],
                    [c.head[2], <Pill key="r" tone={r.tone}>{r.risk}</Pill>],
                    [c.head[3], r.driver],
                    [c.head[4], r.lastEd],
                    [c.head[5], r.gp],
                    [c.head[6], <Pill key="s" tone="plain">{r.signal}</Pill>],
                  ]}
                >
                  <td>{who}</td>
                  <td>{r.suburb}</td>
                  <td><Pill tone={r.tone}>{r.risk}</Pill></td>
                  <td>{r.driver}</td>
                  <td className="n">{r.lastEd}</td>
                  <td style={{ fontSize: '12px' }}>{r.gp}</td>
                  <td><Pill tone="plain">{r.signal}</Pill></td>
                </HospitalRow>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
