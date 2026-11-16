'use client'

import { useTranslation } from 'react-i18next'
import { Sparkline } from '@/components/charts/Sparkline'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { Locked } from '@/components/ui/Locked'
import type { CareRecord } from '@/data/types'
import { SourceFoot } from '@/features/shared/careRecord'
import { EntryLi, Head } from './shell'
import { type RecordShell } from './useRecordShell'
import styles from './record.module.css'

/** Step 6 · Follow-up: the readings since coming home and the 30-day follow-up calls. */
export function FollowUpStep({ record, shell }: { record: CareRecord; shell: RecordShell }) {
  const { t } = useTranslation('record')
  const r = record.followUpReadings
  const f = record.followUp
  return (
    <>
      <Locked cat="records" span={7}>
        <GlassCard span={7}>
          <Head title={t(`followUp.readingsTitle_${shell.who}`)} meta={r.meta} />
          <div className={styles.tiles}>
            {r.tiles.map((x) => (
              <div key={x.label} className={styles.tile}>
                <small>{x.label}</small>
                <div className={styles.val}><b>{x.value}</b><span>{x.unit}</span></div>
                <div className={styles.spark}><Sparkline values={x.spark} color={x.color} decorative /></div>
                <span className={styles.note}>{x.note}</span>
              </div>
            ))}
          </div>
          <p className="fine" style={{ marginBlockStart: 8 }}>{shell.say(r.note)}</p>
          <SourceFoot source={r.source} time={r.time} />
        </GlassCard>
      </Locked>
      <Locked cat="records" span={5}>
        <GlassCard span={5}>
          <Head title={t(`followUp.afterTitle_${shell.who}`)} meta={t('followUp.afterMeta')} />
          <ul className={styles.days}>
            {f.days.map((d) => (
              <EntryLi key={d.day} entry={d.entry} shell={shell}>
                <span className={d.state === 'done' ? styles.yes : undefined} aria-hidden="true">{d.state === 'done' ? <Glyph name="check" /> : '•'}</span>
                <span><b>{d.day}</b><small>{d.text}</small></span>
                <span className={`pill ${d.state === 'done' ? 'good' : 'plain'}`}>{t(`followUp.${d.state === 'done' ? 'done' : 'planned'}`)}</span>
              </EntryLi>
            ))}
          </ul>
          <p className="fine" style={{ marginBlockStart: 8 }}>{f.note}</p>
          <SourceFoot source={f.source} time={f.time} />
        </GlassCard>
      </Locked>
    </>
  )
}
