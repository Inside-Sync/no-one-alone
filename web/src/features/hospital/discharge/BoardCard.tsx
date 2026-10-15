import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import type { DischargeRow, FollowUpState } from '@/data/types'
import { Head } from '../../individual/home/parts'
import { HospitalRow } from '../shared'
import { TableScroll } from '@/components/ui/TableScroll'

const plain = { fontWeight: 500 } as const
const STATE: Record<FollowUpState, [colour: string, mark: string]> = {
  ok: ['#1fb39c', '✓'],
  fl: ['#c88a05', '!'],
  es: ['#d9443f', '↑'],
  up: ['var(--track)', ''],
}

/** `30-day follow-up board` (c12): one row per discharged patient, a status chip for each follow-up call. */
export function BoardCard({ board }: { board: DischargeRow[] }) {
  const { t } = useTranslation('hospital')
  const legend = t('discharge.board.legend', { returnObjects: true })
  const head = t('discharge.board.head', { returnObjects: true })
  return (
    <GlassCard span={12}>
      <Head title={t('discharge.board.title')} meta={t('discharge.board.meta')} />
      <TableScroll>
        <table className="board">
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="board">
            {board.map((r) => (
              <HospitalRow
                key={r.patient}
                title={r.patient}
                details={[
                  [head[0], <b key="p" style={plain}>{r.patient}</b>],
                  [head[1], r.discharged],
                  [head[2], r.diagnosis],
                  ...r.days.flatMap((k, i) => (STATE[k][1] ? [[head[3 + i], <i key={i} style={{ background: STATE[k][0] }}>{STATE[k][1]}</i>] as const] : [])),
                  [head[8], <Pill key="r" tone={r.tone}>{r.risk}</Pill>],
                ]}
              >
                <td><b style={plain}>{r.patient}</b></td>
                <td className="n">{r.discharged}</td>
                <td>{r.diagnosis}</td>
                {r.days.map((k, i) => <td key={i} className="st"><i style={{ background: STATE[k][0] }}>{STATE[k][1]}</i></td>)}
                <td><Pill tone={r.tone}>{r.risk}</Pill></td>
              </HospitalRow>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <div className="legend">
        {legend.map((l) => <span key={l.label}><i style={{ background: l.color }}></i>{l.label}</span>)}
      </div>
    </GlassCard>
  )
}
