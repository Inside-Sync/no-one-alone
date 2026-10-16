import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { RecoveryDoc } from '@/data/contract'
import { audioUrl } from '@/data/repo'
import { nextReminder, type Reminder } from '@/domain/recovery'

/** Plays a saved audio file; a blocked or missing file stays silent. */
function Play({ path }: { path?: string }) {
  const { t } = useTranslation('me')
  if (!path) return null
  const play = () => { audioUrl(path).then((url) => new Audio(url).play()).catch(() => {}) }
  return <button type="button" className="btn soft sm" onClick={play}>{`▶ ${t('recovery.play')}`}</button>
}

const keyOf = (r: Reminder) => r.time + r.text

/** `Your recovery plan` (c12): the plan the hospital sent, with the next reminder by the person's local time. */
export function RecoveryCard({ recovery, tz }: { recovery: RecoveryDoc; tz: string }) {
  const { t } = useTranslation('me')
  const [now, setNow] = useState(() => Date.now()) // layering-allow: the real wall clock, per the brief
  const [done, setDone] = useState<Set<string>>(new Set())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000) // layering-allow: real wall clock
    return () => clearInterval(id)
  }, [])

  const upcoming = nextReminder(recovery.reminders.filter((r) => !done.has(keyOf(r))), now, tz)
  // Nothing left today: tomorrow starts again from the first reminder.
  const first = recovery.reminders[0]
  const next = upcoming?.tomorrow === false ? upcoming : first ? { reminder: first, tomorrow: true } : null
  return (
    <GlassCard span={12}>
      <div className="ch"><h2>{t('recovery.title')}</h2><span className="meta">{t('recovery.home')}</span></div>
      <p style={{ fontSize: 16 }}>{recovery.summary}</p>
      <Play path={recovery.summaryAudioPath} />
      {next && (
        <div className="row" style={{ margin: '12px 0' }}>
          <b style={{ fontSize: 24, color: 'var(--ink)' }}>
            {t(next.tomorrow ? 'recovery.nextTomorrow' : 'recovery.next', { time: next.reminder.time, text: next.reminder.text })}
          </b>
          <Play path={next.reminder.audioPath} />
          {!next.tomorrow && <button type="button" className="btn" onClick={() => setDone(new Set(done).add(keyOf(next.reminder)))}>{t('recovery.done')}</button>}
        </div>
      )}
      <h3>{t('recovery.today')}</h3>
      <ul className="list">
        {recovery.reminders.map((r) => (
          <li key={keyOf(r)} style={done.has(keyOf(r)) ? { opacity: 0.6 } : undefined}>
            <b>{r.time}</b><span>{r.text}</span>{done.has(keyOf(r)) && <span className="pill plain">✓</span>}
          </li>
        ))}
      </ul>
      {recovery.followUps.length > 0 && (
        <>
          <h3>{t('recovery.followUps')}</h3>
          <ul className="list">
            {recovery.followUps.map((f) => <li key={f.text}><span>{t('recovery.followUp', { text: f.text, date: f.date })}</span></li>)}
          </ul>
        </>
      )}
      {recovery.notes && (<><h3>{t('recovery.notes')}</h3><p>{recovery.notes}</p></>)}
    </GlassCard>
  )
}
