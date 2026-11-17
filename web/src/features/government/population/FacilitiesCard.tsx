'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { TableScroll } from '@/components/ui/TableScroll'
import type { Facility, GovernmentData } from '@/data/government.types'
import { toneVar } from '@/lib/tone'
import { Head } from '../../individual/home/parts'
import { BAND_PILL, capacityBand, careStatus, STATUS_COLOUR, STATUS_PILL, toneAt } from '../bands'
import s from '../government.module.css'

type Filter = 'all' | Facility['kind']
const FILTERS: readonly Filter[] = ['all', 'hosp', 'fhc']

const plain = { fontWeight: 500 } as const
/** Outcome at 3 months: green from 65%, amber from 55%. Effectiveness: green from 80, amber from 70. */
const OUTCOME_GOOD = 65, OUTCOME_WARN = 55
const SCORE_GOOD = 80, SCORE_WARN = 70

/** `Performance by hospital and centre` (c12): one row per facility, filtered by kind. */
export function FacilitiesCard({ facilities }: { facilities: GovernmentData['facilities'] }) {
  const { t } = useTranslation('government')
  const [filter, setFilter] = useState<Filter>('all')
  const head = t('population.facilities.head', { returnObjects: true })
  const filters = t('population.facilities.filters', { returnObjects: true })
  const empty = t('population.facilities.empty')
  const rows = facilities.rows.filter((f) => filter === 'all' || f.kind === filter)
  return (
    <GlassCard span={12} id="hospPerf" tour="hospital-performance">
      <Head icon="hospital" title={t('population.facilities.title')}>
        <div className="seg" role="group" aria-label={t('population.facilities.group')} style={{ marginInlineStart: 'auto' }}>
          {FILTERS.map((id) => (
            <button key={id} type="button" aria-pressed={id === filter} onClick={() => setFilter(id)}>{filters[id]}</button>
          ))}
        </div>
      </Head>
      <TableScroll>
        <table style={{ minWidth: 1000 }}>
          <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody id="hfRows">
            {rows.map((f) => {
              const band = capacityBand(f.capacity)
              const status = careStatus(f.inCare)
              return (
                <tr key={f.name}>
                  <td><b style={plain}>{f.name}</b><small>{t(`population.facilities.kinds.${f.kind}`)} · {f.area}</small></td>
                  <td><b className="n">{f.capacity}%</b> <Pill tone={BAND_PILL[band]}>{t(`population.facilities.bands.${band}`)}</Pill></td>
                  <td className="n"><b style={{ color: toneVar(toneAt(f.effectiveness, SCORE_GOOD, SCORE_WARN)) }}>{f.effectiveness}</b><small>{t('population.facilities.outOf')}</small></td>
                  <td>
                    <div className={s.bar}>
                      <i><s style={{ width: `${f.inCare}%`, background: STATUS_COLOUR[status] }}></s></i>
                      <b className="n">{f.inCare}%</b>
                    </div>
                  </td>
                  <td className="n">{f.days}</td>
                  <td className="n">{f.readmitted == null ? <span className={s.muted}>{empty}</span> : `${f.readmitted}%`}</td>
                  <td className="n">{f.open}</td>
                  <td className="n"><span style={{ color: toneVar(toneAt(f.outcome, OUTCOME_GOOD, OUTCOME_WARN)) }}>{f.outcome}%</span><small>{t(`population.facilities.outcomeKinds.${f.outcomeKind}`)}</small></td>
                  <td><Pill tone={STATUS_PILL[status]}>{t(`population.facilities.status.${status}`)}</Pill></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
      <p className={`fine ${s.tableNote}`}>{facilities.tableNote}</p>
    </GlassCard>
  )
}
