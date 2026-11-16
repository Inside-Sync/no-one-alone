'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Locked } from '@/components/ui/Locked'
import { TableScroll } from '@/components/ui/TableScroll'
import type { CareRecord } from '@/data/types'
import { SourceFoot } from '@/features/shared/careRecord'
import { Head } from './shell'
import { type RecordShell } from './useRecordShell'
import styles from './record.module.css'

/** Step 2 · History: past episodes (each opens its chart entry), who holds the records, and the family history. */
export function HistoryStep({ record, shell }: { record: CareRecord; shell: RecordShell }) {
  const { t } = useTranslation('record')
  const h = record.history
  const who = shell.who
  const head = t('history.familyHead', { returnObjects: true })
  return (
    <>
      <Locked cat="records" span={7}>
        <GlassCard span={7} className="records-his">
          <Head title={t(`history.episodesTitle_${who}`)} meta={t('history.episodesMeta', { count: h.episodes.length })} />
          <div className={styles.eps} data-tour="record-episodes">
            {h.episodes.map((e, i) => (
              <details key={e.id} className={styles.ep} open={i === 0}>
                <summary>
                  <span className={styles.epDate}>{e.when}</span>
                  <span className={styles.epMain}><b>{e.title}</b><small>{e.where}</small></span>
                  <span className={`pill ${e.tone}`}>{e.badge}</span>
                </summary>
                <div className={styles.epBody}>
                  <p>{e.detail}</p>
                  <p className="fine"><b>{t('history.access')}</b> <span>{e.access}</span></p>
                  <button type="button" className={`btn sm soft ${styles.epOpen}`} onClick={() => shell.drawer.openEntry(e.entry)}>{t('history.open')}</button>
                </div>
              </details>
            ))}
          </div>
          <SourceFoot source={h.source} time={h.time} />
        </GlassCard>
      </Locked>
      <Locked cat="records" span={5}>
        <GlassCard span={5}>
          <Head title={t(`history.holdersTitle_${who}`)} />
          <ul className={styles.holders}>
            {h.holders.map((r) => (
              <li key={r.name.self}>
                <span className={`${styles.dot} ${r.tone === 'warn' ? styles.dotwarn : styles.dotgood}`} aria-hidden="true">●</span>
                <span><b>{shell.say(r.name)}</b><small>{shell.say(r.text)}</small></span>
              </li>
            ))}
          </ul>
          <p className="fine">{t('history.malaffi')}</p>
          <SourceFoot source={shell.say(h.holdersSource)} time={h.holdersTime} />
        </GlassCard>
      </Locked>
      <Locked cat="records" span={7}>
        <GlassCard span={7}>
          <Head title={t(`history.familyTitle_${who}`)} meta={t('history.familyMeta')} />
          <TableScroll>
            <table style={{ minWidth: 0 }}>
              <thead><tr>{head.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {h.family.map((f) => (
                  <tr key={f.relative}>
                    <td><b style={{ fontWeight: 500 }}>{f.relative}</b></td>
                    <td>{f.conditions}</td>
                    <td><span className={`pill ${f.tone}`}>{f.consent}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <SourceFoot source={h.familySource} time={h.familyTime} />
        </GlassCard>
      </Locked>
    </>
  )
}
