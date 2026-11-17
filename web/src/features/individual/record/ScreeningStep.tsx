'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { Locked } from '@/components/ui/Locked'
import { TableScroll } from '@/components/ui/TableScroll'
import type { CareRecord } from '@/data/types'
import { SourceFoot } from '@/features/shared/careRecord'
import { EntryLi, EntryTr, Head } from './shell'
import { type RecordShell } from './useRecordShell'
import styles from './record.module.css'

/** Step 3 · Screening: the checks made before the stroke and what happened with each warning sign. */
export function ScreeningStep({ record, shell }: { record: CareRecord; shell: RecordShell }) {
  const { t } = useTranslation('record')
  const s = record.screening
  const head = t('screening.head', { returnObjects: true })
  return (
    <>
      <Locked cat="records" span={7}>
        <GlassCard span={7}>
          <Head title={t(`screening.title_${shell.who}`)} meta={s.meta} />
          <TableScroll>
            <table>
              <thead><tr>{head.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {s.rows.map((r) => (
                  <EntryTr key={r.check + r.when} entry={r.entry} shell={shell}>
                    <td className="n">{r.when}</td>
                    <td>{r.check}</td>
                    <td><b style={{ fontWeight: 500 }}>{r.result}</b></td>
                    <td>{r.next}</td>
                  </EntryTr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <SourceFoot source={s.source} time={s.time} />
        </GlassCard>
      </Locked>
      <Locked cat="records" span={5}>
        <GlassCard span={5}>
          <Head title={t('screening.signsTitle')} />
          <ul className={styles.signs}>
            {s.signs.map((r) => (
              <EntryLi key={r.title.self} entry={r.entry} shell={shell}>
                <span className={r.ok ? styles.yes : styles.no} aria-hidden="true"><Glyph name={r.ok ? 'check' : 'circle-x'} /></span>
                <span><b>{shell.say(r.title)}</b><small>{r.note}</small></span>
              </EntryLi>
            ))}
          </ul>
          <p className="fine">{shell.say(s.note)}</p>
          <SourceFoot source={s.signsSource} time={s.signsTime} />
        </GlassCard>
      </Locked>
    </>
  )
}
