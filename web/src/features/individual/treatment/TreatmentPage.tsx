'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@/app/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph, Icon, type IconName } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import { useToast } from '@/components/ui/Toast'
import { audioUrl, getCareRecord, getTreatment } from '@/data/repo'
import type { CareRecord } from '@/data/types'
import type { TreatmentData } from '@/data/treatment.types'
import { RecordHeader, EntryLi, Head } from '@/features/individual/record/shell'
import { useRecordShell, type StepId } from '@/features/individual/record/useRecordShell'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { SourceFoot, StepNav } from '@/features/shared/careRecord'
import { useRepo } from '@/features/shared/useRepo'
import { useLiveIncident } from '@/state/LiveIncident'
import { livePlan, staticPlan, type PlanModel } from './plan'

const RECORD_PATH = '/individual/record'
const FAST = [['meh', 'face'], ['biceps-flexed', 'arm'], ['speech', 'speech'], ['timer', 'time']] as const satisfies readonly (readonly [IconName, string])[]

/** Plays a saved audio file of the live plan; a blocked or missing file stays silent. */
function Play({ path }: { path?: string }) {
  const { t } = useTranslation('treatment')
  if (!path) return null
  const play = () => { audioUrl(path).then((url) => new Audio(url).play()).catch(() => {}) }
  return <button type="button" className="btn soft sm" onClick={play}><Glyph name="play" />{t('plan.play')}</button>
}

/** Individual view · Treatment, step 5 of the care record: the plan the hospital sent. Moza's app speaks to her, family reads the same plan. */
export function TreatmentPage() {
  const plan = useRepo(() => getTreatment())
  const rec = useRepo(() => getCareRecord('margaret'))
  if (plan.status === 'error' || rec.status === 'error') return <PageError page="treatment" onRetry={() => { plan.retry(); rec.retry() }} />
  if (!plan.data || !rec.data) return <PageSkeleton page="treatment" />
  return <TreatmentBody data={plan.data} record={rec.data} />
}

function TreatmentBody({ data, record }: { data: TreatmentData; record: CareRecord }) {
  const { t, i18n } = useTranslation('treatment')
  const router = useRouter()
  const toast = useToast()
  const shell = useRecordShell(record)
  const { recovery, people } = useLiveIncident()
  const tz = people.person?.timezone ?? 'Asia/Dubai'
  const [clock, setClock] = useState(() => Date.now()) // layering-allow: the real wall clock, per the brief
  useEffect(() => {
    if (!recovery) return
    const id = setInterval(() => setClock(Date.now()), 30_000) // layering-allow: real wall clock
    return () => clearInterval(id)
  }, [recovery])

  const base = useMemo(() => staticPlan(data, shell.say), [data, shell])
  const plan = useMemo<PlanModel>(() => recovery
    ? livePlan(recovery, tz, clock, base, {
      stop: (name) => t('plan.stop', { name }),
      slot: (k) => t(`meds.slots.${k}`),
      lang: i18n.language,
    })
    : base, [recovery, tz, clock, base, t, i18n.language])

  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [called, setCalled] = useState<Set<number>>(new Set())
  const isDone = (id: string, initial: boolean) => initial || ticked.has(id)
  const doneCount = plan.tasks.filter((x) => isDone(x.id, x.done)).length
  const open = plan.tasks.filter((x) => !isDone(x.id, x.done))
  const next = open.find((x) => x.time >= plan.now) ?? null
  const tick = (id: string) => { setTicked((s) => new Set(s).add(id)); toast(t('tasks.logged')) }
  const callDone = (day: number, initial: boolean) => initial || called.has(day)
  const nextCall = plan.calls.find((c) => !callDone(c.day, c.done))
  const todayCall = recovery ? plan.day : undefined

  const go = (id: string) => { if (id !== 'tx') router.push(`${RECORD_PATH}?step=${id}`) }
  const who = shell.who

  return (
    <main className="grid" data-page="treatment">
      <RecordHeader shell={shell} record={record} current={'tx' satisfies StepId} onSelect={(id) => go(id)} />

      <article className="glass card c8" data-tour="treatment-plan">
        <Head title={<><Glyph name="sprout" />{t(`plan.title_${who}`)}</>} meta={plan.meta} />
        <p className="rec-sum">{plan.summary}</p>
        {plan.summaryAudio && <div className="row"><Play path={plan.summaryAudio} /></div>}
        <div className="rec-prog">
          <span>{t('plan.dayOf', { day: plan.day })}</span>
          <span className="rec-bar"><i style={{ inlineSize: `${(plan.day / 30) * 100}%` }} /></span>
          <span>{t('plan.doneToday', { done: doneCount, total: plan.tasks.length })}</span>
        </div>
        <div className="row">
          {plan.chips.map((c) => <span key={c.text} className={`chip rec-wrap${c.tone === 'stop' ? ' rec-stop' : ''}`}><Glyph name={c.icon} />{c.text}</span>)}
        </div>
        <SourceFoot {...plan.planSource} />
      </article>

      <GlassCard span={4}>
        <Head title={<><Glyph name="clock" />{t('next.title')}</>} />
        {next ? (
          <>
            <div className="rec-next-time">{next.time}</div>
            <div className="rec-next-text"><Glyph name={next.icon} />{next.title}</div>
            {next.why && <p className="fine">{next.why}</p>}
            <div className="row">
              <button type="button" className="btn" onClick={() => toast(t('next.toast', { text: next.title }))}><Glyph name="bell" />{t('next.showNow')}</button>
              <Play path={next.audio} />
            </div>
          </>
        ) : (
          <>
            <div className="rec-next-text"><Glyph name="party-popper" />{t('next.allDone')}</div>
            {plan.tasks[0] && <p className="fine">{t('next.tomorrow', { time: plan.tasks[0].time, text: plan.tasks[0].title })}</p>}
          </>
        )}
        <SourceFoot {...plan.remindersSource} />
      </GlassCard>

      <GlassCard span={6}>
        <Head title={<><Glyph name="pill" />{t('tasks.title')}</>} meta={t('tasks.meta')} />
        <ul className="rec-today">
          {plan.tasks.map((task) => {
            const done = isDone(task.id, task.done)
            return (
              <li key={task.id} className={done ? 'done' : next?.id === task.id ? 'now' : undefined}>
                <span className="rec-tm">{task.time}</span>
                <span className="ic"><Icon name={task.icon} tint /></span>
                <span><b>{task.title}</b>{task.why && <small>{task.why}</small>}</span>
                {done
                  ? <span className="pill good">{t('tasks.done')}</span>
                  : (
                    <span className="row" style={{ gap: 6 }}>
                      <Play path={task.audio} />
                      <button
                        type="button"
                        className={`btn${next?.id === task.id ? '' : ' soft'} sm`}
                        aria-label={`${t(task.kind === 'MED' ? 'tasks.taken' : 'tasks.done')}: ${task.title}`}
                        onClick={() => tick(task.id)}
                      >
                        {t(task.kind === 'MED' ? 'tasks.taken' : 'tasks.done')}
                      </button>
                    </span>
                  )}
              </li>
            )
          })}
        </ul>
        <SourceFoot {...plan.tasksSource} />
      </GlassCard>

      <GlassCard span={6}>
        <Head title={<><Glyph name="notebook-text" />{t(`meds.title_${who}`)}</>} />
        <ul className="list">
          {plan.meds.map((m) => (
            <EntryLi key={m.key} entry={m.entry} shell={shell}>
              <span className="li"><span className="ic"><Icon name="pill" tint /></span></span>
              <span><b>{m.name}{m.when && ` · ${m.when}`}</b>{m.why && <small>{m.why}</small>}</span>
              {m.change && <span className={`pill ${m.change === 'Continue' ? 'plain' : 'warn'}`}>{t(`meds.change.${m.change}`)}</span>}
            </EntryLi>
          ))}
        </ul>
        <SourceFoot {...plan.medsSource} />
      </GlassCard>

      <GlassCard span={4}>
        <Head title={<><Glyph name="calendar" />{t('appts.title')}</>} />
        <ul className="list">
          {plan.appts.map((a) => (
            <EntryLi key={a.key} entry={a.entry} shell={shell}>
              <span className="li"><span className="ic"><Icon name="calendar" tint /></span></span>
              <span><b>{a.title}</b><small>{a.when}</small></span>
              <span onClick={(e) => e.stopPropagation()}>
                <OnceButton className="soft sm" toast={t('appts.toast')} done={`✓ ${t('appts.added')}`}>{t('appts.add')}</OnceButton>
              </span>
            </EntryLi>
          ))}
        </ul>
        {plan.notes && <p className="fine">{plan.notes}</p>}
        <SourceFoot {...plan.apptsSource} />
      </GlassCard>

      <GlassCard span={4} className="rec-fast">
        <Head title={<><Glyph name="siren" />{t('warning.title')}</>} />
        <ul className="why">
          {FAST.map(([ic, k]) => <li key={k}><span className="ic"><Icon name={ic} tint /></span><span><b>{t(`warning.${k}`)}</b> {t(`warning.${k}Text`)}</span></li>)}
        </ul>
        <div className="row"><button type="button" className="btn sos" style={{ inlineSize: '100%' }} onClick={() => toast(t('warning.calling'))}><span className="ic"><Icon name="phone" /></span>{t('warning.call')}</button></div>
        <SourceFoot {...plan.warningSource} />
      </GlassCard>

      <GlassCard span={4}>
        <Head title={<><Glyph name="phone" />{t('calls.title')}</>} meta={t(`calls.meta_${who}`)} />
        <ul className="list">
          {plan.calls.map((c) => {
            const done = callDone(c.day, c.done)
            const today = !done && c.day === todayCall
            return (
              <li key={c.day}>
                <span className="li"><span className="ic"><Icon name="message-circle" tint /></span></span>
                <span>
                  <b>{c.date ? `${t('calls.day', { day: c.day })} · ${c.date}` : t('calls.day', { day: c.day })}</b>
                  <small>{t(`calls.topics.${c.day}` as 'calls.topics.1')}</small>
                </span>
                <span className={`pill ${done ? 'good' : today ? 'warn' : 'plain'}`}>{done ? t('calls.done') : today ? t('calls.today') : t('calls.planned')}</span>
              </li>
            )
          })}
        </ul>
        {nextCall && (
          <div className="row" style={{ marginBlockStart: 10 }}>
            <button type="button" className="btn soft" style={{ inlineSize: '100%' }} onClick={() => setCalled((s) => new Set(s).add(nextCall.day))}>
              <Glyph name="fast-forward" />{t('calls.jump')}
            </button>
          </div>
        )}
        <SourceFoot {...plan.callsSource} />
      </GlassCard>

      <StepNav steps={shell.steps} current="tx" onSelect={go} labels={shell.labels} />
    </main>
  )
}
