'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Locked } from '@/components/ui/Locked'
import { TableScroll } from '@/components/ui/TableScroll'
import type { CareRecord, LabRow } from '@/data/types'
import { SourceFoot } from '@/features/shared/careRecord'
import { EntryTr, Head } from './shell'
import { type RecordShell } from './useRecordShell'

/** One `.lab` mini: last four results, reference range shaded, colour by the latest. */
function Lab({ lab }: { lab: LabRow }) {
  const [lo, hi] = lab.axis
  const y = (v: number) => 36 - ((v - lo) / (hi - lo)) * 32
  const xs = (i: number) => 6 + i * 29
  const r0 = Math.max(lab.reference[0], lo)
  const r1 = Math.min(lab.reference[1], hi)
  const last = lab.values[3]
  const ok = last >= lab.reference[0] && last <= lab.reference[1]
  const stroke = ok ? '#0b7f71' : '#c88a05'
  const d = lab.values.map((v, i) => `${i ? 'L' : 'M'}${xs(i)} ${y(v).toFixed(1)}`).join(' ')
  return (
    <div className="lab">
      <span className="t"><span>{lab.name}</span><span className="mono">{lab.unit}</span></span>
      <b style={{ color: ok ? 'inherit' : 'var(--warn-text)' }}>{last}</b>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none">
        <rect x="0" y={y(r1)} width="100" height={y(r0) - y(r1)} fill="rgba(31,179,156,.14)" />
        <path d={d} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {lab.values.map((v, i) => <circle key={i} cx={xs(i)} cy={y(v).toFixed(1)} r="2.2" fill={stroke} />)}
      </svg>
      <span className="fine">{lab.note}</span>
    </div>
  )
}

/** Step 4 · Results: the hospital tests (each opens its chart entry) and the pathology trends. */
export function ResultsStep({ record, shell }: { record: CareRecord; shell: RecordShell }) {
  const { t } = useTranslation('record')
  const r = record.results
  const head = t('results.head', { returnObjects: true })
  return (
    <>
      <Locked cat="records" span={7}>
        <GlassCard span={7}>
          <Head title={t('results.title')} meta={r.meta} />
          <TableScroll>
            <table>
              <thead><tr>{head.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {r.rows.map((row) => (
                  <EntryTr key={row.test} entry={row.entry} shell={shell}>
                    <td>{row.test}</td>
                    <td><b style={{ fontWeight: 500 }}>{row.showed}</b></td>
                    <td className="n">{row.when}</td>
                  </EntryTr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <SourceFoot source={r.source} time={r.time} />
        </GlassCard>
      </Locked>
      <Locked cat="records" span={5}>
        <GlassCard span={5}>
          <Head title={t('labs.title')} meta={t('labs.meta')} />
          <div className="labs" id="labs">{record.labs.map((l) => <Lab key={l.name} lab={l} />)}</div>
          <SourceFoot {...record.labsSource} />
        </GlassCard>
      </Locked>
    </>
  )
}
