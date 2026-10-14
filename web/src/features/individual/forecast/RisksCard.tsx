import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { FORECAST_COPY } from '@/data/repo'
import type { RiskRow } from '@/data/types'
import { Head } from '../home/parts'

const trendColour = (t: RiskRow['trend']) => (t === '↑' ? 'var(--bad)' : t === '↓' ? 'var(--good)' : 'var(--muted)')

/** `📊 Chances over time` (c7): `#riskRows`. */
export function RisksCard({ risks }: { risks: RiskRow[] }) {
  const c = FORECAST_COPY.risks
  return (
    <GlassCard span={7}>
      <Head title={c.title} meta={c.meta} />
      <div className="tw">
        <table>
          <thead><tr>{c.columns.map((h) => <th key={h}>{h}</th>)}</tr></thead>
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
      </div>
    </GlassCard>
  )
}
