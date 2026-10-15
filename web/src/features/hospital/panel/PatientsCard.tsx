import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import type { PanelRow } from '@/data/types'
import { Head } from '../../individual/home/parts'
import { HospitalRow } from '../shared'
import { TableScroll } from '@/components/ui/TableScroll'

const plain = { fontWeight: 500 } as const
const riskOf = (r: PanelRow) => parseFloat(r.risk)

/** `Older patients in the catchment` (c8): ranked by 30-day admission risk, highest first. */
export function PatientsCard({ rows }: { rows: PanelRow[] }) {
  const { t } = useTranslation('hospital')
  const head = t('panel.table.head', { returnObjects: true })
  const ranked = [...rows].sort((a, b) => riskOf(b) - riskOf(a))
  return (
    <GlassCard span={8}>
      <Head title={t('panel.table.title')} meta={t('panel.table.meta')} />
      <TableScroll>
        <table>
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="panelRows">
            {ranked.map((r) => {
              const who = <><b style={plain}>{r.name}</b><small>{r.age} · {t(`panel.table.sex.${r.sex}`)}</small></>
              return (
                <HospitalRow
                  key={r.name}
                  title={r.name}
                  details={[
                    [head[0], who],
                    [head[1], r.suburb],
                    [head[2], <Pill key="r" tone={r.tone}>{r.risk}</Pill>],
                    [head[3], r.driver],
                    [head[4], r.lastEd],
                    [head[5], r.gp],
                    [head[6], <Pill key="s" tone="plain">{r.signal}</Pill>],
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
