import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { FORECAST_COPY } from '@/data/repo'
import type { SignRow } from '@/data/types'
import { Head } from '../home/parts'

const colour = (t: SignRow['tone']) => (t === 'warn' ? 'var(--warn)' : t === 'bad' ? 'var(--bad)' : 'var(--good)')

/** `👀 What we keep an eye on` (c12): `#sigRows`, plain-language version. */
export function SignsCard({ signs }: { signs: SignRow[] }) {
  const c = FORECAST_COPY.signs
  return (
    <GlassCard span={12}>
      <Head title={c.title} meta={c.meta} />
      <div className="tw">
        <table>
          <thead><tr>{c.columns.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="sigRows">
            {signs.map((r) => (
              <tr key={r.sign}>
                <td>{r.sign}</td>
                <td>{r.from}</td>
                <td>{r.frequency}</td>
                <td className="n">{r.now}</td>
                <td className="n">{r.usual}</td>
                <td style={{ color: colour(r.tone) }}>{r.comparison}</td>
                <td><Pill tone={r.tone}>{c.status[r.tone]}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
