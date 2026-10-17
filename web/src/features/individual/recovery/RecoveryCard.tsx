import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import type { RecoveryDoc } from '@/data/contract'
import { audioUrl } from '@/data/repo'
import { SLOTS, isStopped, medsExplained, nextReminder, todayTasks, type Reminder } from '@/domain/recovery'

/** Plays a saved audio file; a blocked or missing file stays silent. */
function Play({ path }: { path?: string }) {
  const { t } = useTranslation('me')
  if (!path) return null
  const play = () => { audioUrl(path).then((url) => new Audio(url).play()).catch(() => {}) }
  return <button type="button" className="btn soft sm" onClick={play}>{`▶ ${t('recovery.play')}`}</button>
}

const keyOf = (r: Reminder) => r.time + r.text

/** `Your recovery plan` (c12): the plan the hospital sent, with the next reminder by the person's local time. */
export function RecoveryCard({ recovery, tz, who = 'self' }: { recovery: RecoveryDoc; tz: string; who?: 'self' | 'family' }) {
  const { t } = useTranslation('me')
  const [now, setNow] = useState(() => Date.now()) // layering-allow: the real wall clock, per the brief
  const [done, setDone] = useState<Set<string>>(new Set())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000) // layering-allow: real wall clock
    return () => clearInterval(id)
  }, [])
  const tick = (id: string) => setDone(new Set(done).add(id))

  const tasks = todayTasks(recovery)
  const meds = medsExplained(recovery)
  const reminders = recovery.reminders.filter((r) => tasks.some((x) => x.id === keyOf(r)))
  const upcoming = nextReminder(reminders.filter((r) => !done.has(keyOf(r))), now, tz)
  // Nothing left today: tomorrow starts again from the first reminder.
  const first = reminders[0]
  const next = upcoming?.tomorrow === false ? upcoming : first ? { reminder: first, tomorrow: true } : null
  return (
    <GlassCard span={12}>
      <div className="ch"><h2>{t('recovery.title', { context: who })}</h2><span className="meta">{t('recovery.home')}</span></div>
      <p style={{ fontSize: 16 }}>{recovery.summary}</p>
      <Play path={recovery.summaryAudioPath} />
      <div className="row" style={{ margin: '10px 0' }}>
        {recovery.meds.filter(isStopped).map((m) => <span key={m.name} className="pill bad">{t('recovery.stop', { name: m.name })}</span>)}
        {recovery.activities.filter((a) => !a.times.length).map((a) => <span key={a.text} className="chip" style={{ whiteSpace: 'normal' }}>{a.text}</span>)}
      </div>
      {next && (
        <div className="row" style={{ margin: '12px 0' }}>
          <b style={{ fontSize: 24, color: 'var(--ink)' }}>
            {t(next.tomorrow ? 'recovery.nextTomorrow' : 'recovery.next', { time: next.reminder.time, text: next.reminder.text })}
          </b>
          <Play path={next.reminder.audioPath} />
          {!next.tomorrow && <button type="button" className="btn" onClick={() => tick(keyOf(next.reminder))}>{t('recovery.done')}</button>}
        </div>
      )}
      <h3>{t('recovery.today')}</h3>
      <ul className="list">
        {tasks.map((task) => {
          const label = t(task.kind === 'MED' ? 'recovery.taken' : 'recovery.tick')
          return (
            <li key={task.id} style={done.has(task.id) ? { opacity: 0.6 } : undefined}>
              <b>{task.time}</b>
              <span>{task.title}{task.why && <small style={{ display: 'block' }}>{task.why}</small>}</span>
              <span className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                <Play path={task.audioPath} />
                {done.has(task.id)
                  ? <span className="pill plain">✓</span>
                  : <button type="button" className="btn soft sm" aria-label={`${label}: ${task.title}`} onClick={() => tick(task.id)}>{label}</button>}
              </span>
            </li>
          )
        })}
      </ul>
      {meds.length > 0 && <h3>{t('recovery.meds', { context: who })}</h3>}
      <ul className="list">
        {meds.map((m) => (
          <li key={m.name}>
            <b aria-hidden="true">💊</b>
            <span>
              <strong>{m.name} {m.dose}</strong> · {m.times.map((x) => (x in SLOTS ? t(`recovery.slots.${SLOTS[x as keyof typeof SLOTS]}`) : x)).join(', ')}
              {m.why && <small style={{ display: 'block' }}>{m.why}</small>}
            </span>
            {m.change && <span className={`pill ${m.change === 'Continue' ? 'plain' : 'warn'}`}>{t(`recovery.change.${m.change as 'New'}`)}</span>}
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
