import { useTranslation } from 'react-i18next'
import { CardHeader } from '@/components/ui/CardHeader'
import { Pill } from '@/components/ui/Pill'
import { TableScroll } from '@/components/ui/TableScroll'
import type { OverviewDepartment } from '@/data/types'
import { BAND_TONE, bandOf, pctOf, usageColour } from './bands'
import { HpBar } from './HpBar'
import './overview.css'

const plain = { fontWeight: 500 } as const

/** `Departments and capacity` (c12, `data-tour="departments"`): doctor in charge, doctors on shift, patients per doctor, flow and status. */
export function DepartmentsCard({ rows }: { rows: OverviewDepartment[] }) {
  const { t } = useTranslation('overview')
  const head = t('departments.head', { returnObjects: true }) as string[]
  return (
    <article className="glass card c12" data-tour="departments">
      <CardHeader icon="hospital" title={t('departments.title')} meta={t('departments.meta')} />
      <TableScroll>
        <table className="dep">
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="depRows">
            {rows.map((d) => {
              const pct = pctOf(d.used, d.total)
              const band = bandOf(pct)
              const perDoctor = (d.used / d.onShift).toFixed(1)
              const status = <Pill tone={BAND_TONE[band]}>{t(`departments.status.${band}`)}</Pill>
              return (
                <tr key={d.name}>
                  <td><b style={plain}>{d.name}</b></td>
                  <td>{d.capacity}</td>
                  <td><HpBar pct={pct} colour={usageColour(pct)} value={d.used} /></td>
                  <td>{d.doctor}</td>
                  <td className="n">{d.onShift}</td>
                  <td className="n">{perDoctor}</td>
                  <td>{d.flow}</td>
                  <td>{status}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
      <p className="fine">{t('departments.note')}</p>
    </article>
  )
}
