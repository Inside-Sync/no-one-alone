import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/components/ui/Toast'
import type { RecoveryDoc } from '@/data/contract'
import {
  SLOTS, dayLabel, daysHome, followUpCalls, isStopped, medsExplained, nextReminder, partOfDay, taskIcon, todayTasks,
  type Med, type Task,
} from '@/domain/recovery'
import { Play } from './RecoveryCard'

type Layout = 'detailed' | 'simple'
const LAYOUT_KEY = 'noa.recovery.layout'

function readLayout(): Layout {
  try {
    return localStorage.getItem(LAYOUT_KEY) === 'simple' ? 'simple' : 'detailed'
  } catch {
    return 'detailed'
  }
}

/** Today's tasks, which are ticked, and the next one due by the person's local clock (null once the day is over). */
function useRecoveryDay(recovery: RecoveryDoc, tz: string) {
  const [now, setNow] = useState(() => Date.now()) // layering-allow: the real wall clock, per the brief
  const [done, setDone] = useState<Set<string>>(new Set())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000) // layering-allow: real wall clock
    return () => clearInterval(id)
  }, [])
  const tasks = todayTasks(recovery)
  const open = tasks.filter((x) => !done.has(x.id))
  const due = nextReminder(open.map((x) => ({ time: x.time, kind: x.kind, text: x.id })), now, tz)
  const next = due && !due.tomorrow ? open.find((x) => x.id === due.reminder.text) ?? null : null
  const later = next ? open.filter((x) => x.id !== next.id && x.time >= next.time).slice(0, 3) : []
  const day = Math.min(30, Math.max(1, daysHome(recovery.createdAt, now, tz)))
  return { now, tasks, done, next, later, day, tick: (id: string) => setDone((d) => new Set(d).add(id)) }
}

type Day = ReturnType<typeof useRecoveryDay>

function useMedLine() {
  const { t } = useTranslation('me')
  return (m: Med) => m.times.map((x) => (x in SLOTS ? t(`recovery.slots.${SLOTS[x as keyof typeof SLOTS]}`) : x)).join(', ')
}

function ChangePill({ change }: { change?: Med['change'] }) {
  const { t } = useTranslation('me')
  if (!change) return null
  return <span className={`pill ${change === 'Continue' ? 'plain' : 'warn'}`}>{t(`recovery.change.${change}`)}</span>
}

const FAST = [['😐', 'face'], ['💪', 'arm'], ['🗣️', 'speech'], ['⏱️', 'time']] as const

function CallButton({ big }: { big?: boolean }) {
  const { t } = useTranslation('me')
  const toast = useToast()
  return <button type="button" className={`btn sos${big ? ' rec-bigbtn' : ''}`} onClick={() => toast(t('recovery.self.fast.calling'))}>{t('recovery.self.fast.call')}</button>
}

function TaskButton({ task, day, label }: { task: Task; day: Day; label?: string }) {
  const { t } = useTranslation('me')
  const toast = useToast()
  const text = label ?? t(task.kind === 'MED' ? 'recovery.taken' : 'recovery.tick')
  return (
    <button
      type="button"
      className={`btn${label ? ' rec-bigbtn' : day.next?.id === task.id ? ' sm' : ' soft sm'}`}
      aria-label={`${text}: ${task.title}`}
      onClick={() => { day.tick(task.id); toast(t('recovery.self.logged')) }}
    >
      {text}
    </button>
  )
}

/** The call plan with today's call marked; no call outcomes are stored, so other days stay "Planned". */
function CallList({ recovery, tz, day }: { recovery: RecoveryDoc; tz: string; day: number }) {
  const { t, i18n } = useTranslation('me')
  return (
    <ul className="list">
      {followUpCalls(recovery.createdAt, tz).map((c) => (
        <li key={c.day}>
          <span className="li">💬</span>
          <span>
            <b>{t('recovery.calls.when', { day: c.day, date: dayLabel(c.date, i18n.language) })}</b>
            <small>{t(`recovery.calls.topics.${c.day}` as 'recovery.calls.topics.1')}</small>
          </span>
          {c.day === day
            ? <span className="pill warn">{t('recovery.self.callToday')}</span>
            : <span className="pill plain">{t('recovery.calls.planned')}</span>}
        </li>
      ))}
    </ul>
  )
}

function ApptList({ recovery }: { recovery: RecoveryDoc }) {
  const { i18n } = useTranslation('me')
  return (
    <ul className="list">
      {recovery.followUps.map((f) => (
        <li key={f.text}><span className="li">📅</span><span><b>{f.text}</b><small>{dayLabel(f.date, i18n.language)}</small></span></li>
      ))}
    </ul>
  )
}

function MedList({ recovery }: { recovery: RecoveryDoc }) {
  const medLine = useMedLine()
  return (
    <ul className="list">
      {medsExplained(recovery).map((m) => (
        <li key={m.name}>
          <span className="li">💊</span>
          <span><b>{m.name} {m.dose}{m.times.length > 0 && ` · ${medLine(m)}`}</b>{m.why && <small>{m.why}</small>}</span>
          <ChangePill change={m.change} />
        </li>
      ))}
    </ul>
  )
}

/** Detailed layout: the full plan on a glass grid (summary + next reminder, today + medicines, visits / warning signs / calls). */
function Detailed({ recovery, tz, day }: { recovery: RecoveryDoc; tz: string; day: Day }) {
  const { t } = useTranslation('me')
  const { tasks, done, next } = day
  const meds = medsExplained(recovery)
  const stopped = recovery.meds.filter(isStopped)
  return (
    <>
      <GlassCard span={8}>
        <div className="ch"><h2>{t('recovery.self.happened')}</h2><span className="meta">{t('recovery.self.happenedMeta')}</span></div>
        <p className="rec-sum">{recovery.summary}</p>
        <div className="row"><Play path={recovery.summaryAudioPath} /></div>
        <div className="rec-prog">
          <span>{t('recovery.self.dayOf', { day: day.day })}</span>
          <span className="rec-bar"><i style={{ width: `${(day.day / 30) * 100}%` }} /></span>
          <span>{t('recovery.self.doneToday', { done: done.size, total: tasks.length })}</span>
        </div>
        <div className="row">
          {stopped.map((m) => <span key={m.name} className="chip rec-stop">{t('recovery.stop', { name: m.name })}</span>)}
          {recovery.activities.filter((a) => !a.times.length).map((a) => <span key={a.text} className="chip rec-wrap">{a.text}</span>)}
        </div>
      </GlassCard>
      <GlassCard span={4}>
        <div className="ch"><h2>{t('recovery.self.nextTitle')}</h2></div>
        {next ? (
          <>
            <div className="rec-next-time">{next.time}</div>
            <div className="rec-next-text">{taskIcon(next)} {next.title}</div>
            {next.why && <p className="fine">{next.why}</p>}
            <div className="row"><TaskButton task={next} day={day} /><Play path={next.audioPath} /></div>
          </>
        ) : (
          <>
            <div className="rec-next-text">{t('recovery.self.allDone')}</div>
            {tasks[0] && <p className="fine">{t('recovery.nextTomorrow', { time: tasks[0].time, text: tasks[0].title })}</p>}
          </>
        )}
      </GlassCard>
      <GlassCard span={6}>
        <div className="ch"><h2>{t('recovery.self.tasksTitle')}</h2><span className="meta">{t('recovery.self.tasksMeta')}</span></div>
        <ul className="rec-today">
          {tasks.map((task) => (
            <li key={task.id} className={done.has(task.id) ? 'done' : next?.id === task.id ? 'now' : undefined}>
              <span className="rec-tm">{task.time}</span>
              <span aria-hidden="true">{taskIcon(task)}</span>
              <span><b>{task.title}</b>{task.why && <small>{task.why}</small>}</span>
              {done.has(task.id) ? <span className="pill good">✓</span> : <TaskButton task={task} day={day} />}
            </li>
          ))}
        </ul>
      </GlassCard>
      <GlassCard span={6}>
        <div className="ch"><h2>{t('recovery.meds')}</h2></div>
        {meds.length > 0 && <MedList recovery={recovery} />}
      </GlassCard>
      <GlassCard span={4}>
        <div className="ch"><h2>{t('recovery.self.appts')}</h2></div>
        <ApptList recovery={recovery} />
      </GlassCard>
      <GlassCard span={4} className="rec-fast">
        <div className="ch"><h2>{t('recovery.self.fast.title')}</h2></div>
        <ul className="why">
          {FAST.map(([ic, k]) => <li key={k}><span>{ic}</span><span><b>{t(`recovery.self.fast.${k}`)}</b> {t(`recovery.self.fast.${k}Text`)}</span></li>)}
        </ul>
        <div className="row"><CallButton /></div>
      </GlassCard>
      <GlassCard span={4}>
        <div className="ch"><h2>{t('recovery.calls.title')}</h2><span className="meta">{t('recovery.self.callsMeta')}</span></div>
        <CallList recovery={recovery} tz={tz} day={day.day} />
      </GlassCard>
      {recovery.notes && (
        <GlassCard span={12}>
          <div className="ch"><h2>{t('recovery.notes')}</h2></div>
          <p className="rec-sum">{recovery.notes}</p>
        </GlassCard>
      )}
    </>
  )
}

type Pane = 'meds' | 'appts' | 'calls' | 'help'
const PANES: Pane[] = ['meds', 'appts', 'calls', 'help']

/** Simple layout: one task at a time in large type with two big buttons; everything else sits behind four tabs. */
function Simple({ recovery, tz, day }: { recovery: RecoveryDoc; tz: string; day: Day }) {
  const { t } = useTranslation('me')
  const toast = useToast()
  const [pane, setPane] = useState<Pane>('meds')
  const { tasks, done, next, later } = day
  const stopped = recovery.meds.filter(isStopped)
  return (
    <div className="rec-simple">
      <div className="rec-greet">
        <div>
          <h2 className="hello">{t(`recovery.self.simple.hello_${partOfDay(day.now, tz)}`)}</h2>
          <div className="me-sub">{t('recovery.self.simple.sub', { day: day.day })}</div>
        </div>
        <div className="rec-count">
          <div className="rec-dots" aria-hidden="true">{tasks.map((x) => <i key={x.id} className={done.has(x.id) ? 'on' : undefined} />)}</div>
          <span className="fine">{t('recovery.self.doneToday', { done: done.size, total: tasks.length })}</span>
        </div>
      </div>

      <section className="glass rec-now">
        {next ? (
          <>
            <span className="vbanner">{t('recovery.self.simple.now')}</span>
            <div className="rec-now-time">{next.time}</div>
            <div className="rec-now-text">{taskIcon(next)} {next.title}</div>
            {next.why && <p>{next.why}</p>}
            <div className="rec-big">
              <TaskButton task={next} day={day} label={t(next.kind === 'MED' ? 'recovery.self.simple.tookThem' : 'recovery.self.simple.didIt')} />
              <button type="button" className="btn soft rec-bigbtn" onClick={() => toast(t('recovery.self.simple.snoozed'))}>{t('recovery.self.simple.snooze')}</button>
            </div>
            <div className="row"><Play path={next.audioPath} /></div>
          </>
        ) : (
          <>
            <div className="rec-now-text">{t('recovery.self.allDone')}</div>
            {tasks[0] && <p>{t('recovery.nextTomorrow', { time: tasks[0].time, text: tasks[0].title })}</p>}
          </>
        )}
      </section>

      {next && (
        <GlassCard>
          <div className="ch"><h2>{t('recovery.self.simple.later')}</h2><span className="meta">{t('recovery.self.simple.laterMeta')}</span></div>
          {later.length
            ? <div className="rec-strip">{later.map((x) => <div key={x.id}><span className="rec-tm">{x.time}</span><b>{taskIcon(x)} {x.title}</b></div>)}</div>
            : <p className="me-sub">{t('recovery.self.simple.nothingLater')}</p>}
        </GlassCard>
      )}

      <div className="glass rec-tabs" role="tablist">
        {PANES.map((p) => (
          <button key={p} type="button" role="tab" id={`rec-tab-${p}`} aria-selected={pane === p} aria-controls="rec-pane" onClick={() => setPane(p)}>
            {t(`recovery.self.simple.tabs.${p}`)}
          </button>
        ))}
      </div>
      <section className="glass rec-pane" id="rec-pane" role="tabpanel" aria-labelledby={`rec-tab-${pane}`}>
        {pane === 'meds' && (
          <>
            <div className="ch">
              <h2>{t('recovery.self.simple.tablets')}</h2>
              {stopped.map((m) => <span key={m.name} className="pill bad">{t('recovery.stop', { name: m.name })}</span>)}
            </div>
            <MedList recovery={recovery} />
          </>
        )}
        {pane === 'appts' && (<><div className="ch"><h2>{t('recovery.self.simple.visits')}</h2></div><ApptList recovery={recovery} /></>)}
        {pane === 'calls' && (
          <>
            <div className="ch"><h2>{t('recovery.self.simple.noaCalls')}</h2><span className="meta">{t('recovery.self.simple.noaCallsMeta')}</span></div>
            <CallList recovery={recovery} tz={tz} day={day.day} />
          </>
        )}
        {pane === 'help' && (
          <>
            <div className="ch"><h2>{t('recovery.self.fast.title')}</h2></div>
            <div className="rec-fastbig">
              {FAST.map(([ic, k]) => <div key={k}><b>{ic} {t(`recovery.self.fast.${k}`)}</b>{t(`recovery.self.fast.${k}Text`)}</div>)}
            </div>
            <div className="rec-big"><CallButton big /></div>
            <h3>{t('recovery.self.simple.happened')}</h3>
            <p className="rec-sum">{recovery.summary}</p>
            <div className="row"><Play path={recovery.summaryAudioPath} /></div>
          </>
        )}
      </section>
    </div>
  )
}

/** Margaret's own recovery page: the same plan in a detailed or a simple layout, her choice, remembered on this device. */
export function SelfRecovery({ recovery, tz }: { recovery: RecoveryDoc; tz: string }) {
  const { t } = useTranslation('me')
  const [layout, setLayout] = useState<Layout>(readLayout)
  const day = useRecoveryDay(recovery, tz)
  const choose = (l: Layout) => {
    setLayout(l)
    try { localStorage.setItem(LAYOUT_KEY, l) } catch { /* private mode: keep it for this visit only */ }
  }
  return (
    <main className="grid" data-page="recovery">
      <div className="c12 rec-layout">
        <div className="views" role="group" aria-label={t('recovery.self.layout.label')}>
          {(['detailed', 'simple'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={layout === l} onClick={() => choose(l)}>{t(`recovery.self.layout.${l}`)}</button>
          ))}
        </div>
      </div>
      {layout === 'detailed' ? <Detailed recovery={recovery} tz={tz} day={day} /> : <Simple recovery={recovery} tz={tz} day={day} />}
    </main>
  )
}
