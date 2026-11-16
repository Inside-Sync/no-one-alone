'use client'

import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkline } from '@/components/charts/Sparkline'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import { intlLocale } from '@/i18n'
import type { PatientFlag, PatientTask, PatientVital } from '@/data/patients.types'
import { EntryLink, Head, Src } from './parts'
import { initialsOf, useRecord, useRowOpen } from './context'

const TONE_VAR: Record<string, string> = { bad: 'var(--bad)', warn: 'var(--warn)', good: 'var(--good)', plain: 'var(--muted)' }

/** Name, status and the five actions of the care team. */
function Header() {
  const { t } = useTranslation('patients')
  const toast = useToast()
  const { patient: p, session } = useRecord()
  const act = (a: 'call' | 'msg' | 'book' | 'esc' | 'rev') => {
    if (a === 'rev') session.review(p.id)
    const first = p.name.split(/\s+/)[0]
    const text = a === 'call'
      ? (p.callIn ? t('fu.toasts.callIn', { name: p.name, lang: p.lang }) : t('fu.toasts.call', { name: p.name }))
      : t(`fu.toasts.${a}`, { lang: p.lang, first })
    toast(text)
  }
  return (
    <GlassCard span={12}>
      <div className="pt-head">
        <span className="av" style={{ '--c': p.kind === 'dis' ? '#2563a8' : '#0b7f71', width: 52, height: 52, fontSize: 17 } as CSSProperties}>{initialsOf(p.name)}</span>
        <div className="who">
          <h2>{t('list.nameAge', { name: p.name, age: p.age })}</h2>
          <div className="sub">{t('fu.sub', { sex: t(`ctx.${p.sex}`), area: p.area, lang: p.lang, owner: p.owner })}</div>
        </div>
        <Pill tone={p.status.tone}>{p.status.label}</Pill>
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <span className="chip"><b>{p.why}</b></span>
        <span className="chip">{p.day}</span>
        <span className="chip">{t('fu.homeData', { last: p.last })}</span>
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn sm" onClick={() => act('call')}>{p.callIn ? t('fu.callIn', { lang: p.lang }) : t('fu.call')}</button>
        <button type="button" className="btn sm soft" onClick={() => act('msg')}>{t('fu.msg')}</button>
        <button type="button" className="btn sm soft" onClick={() => act('book')}>{t('fu.book')}</button>
        <button type="button" className="btn sm soft" onClick={() => act('esc')}>{t('fu.esc')}</button>
        <button type="button" className="btn sm soft" onClick={() => act('rev')}>{t('fu.rev')}</button>
      </div>
    </GlassCard>
  )
}

function Vital({ v }: { v: PatientVital }) {
  const { i18n } = useTranslation()
  const last = v.values[v.values.length - 1]
  const ok = v.target == null || v.dir === 0 ? null : v.dir > 0 ? last >= v.target : last <= v.target
  const colour = ok === null ? '#2f6fb0' : ok ? '#1f8f5f' : '#d9443f'
  return (
    <div>
      <small>{v.label}</small>
      <b>{new Intl.NumberFormat(intlLocale(i18n.language)).format(last)}<small>{v.unit}</small></b>
      <Sparkline values={v.values} color={colour} decorative />
      <em style={{ color: colour }}>{v.note}</em>
    </div>
  )
}

/** `Since discharge` / `Since treatment started`: the readings the patient shares from the app. */
function Home() {
  const { t } = useTranslation('patients')
  const { patient: p, gender } = useRecord()
  return (
    <GlassCard span={12} tour="chart-followup">
      <Head title={<><Glyph name="heart" />{p.kind === 'dis' ? t('fu.homeDis') : t('fu.homeTx')}</>} meta={t('fu.homeMeta')} />
      {p.vitals.length ? <div className="pt-vit">{p.vitals.map((v) => <Vital key={v.label} v={v} />)}</div> : <p className="fine">{t('fu.noData', { context: gender })}</p>}
      <div className="pt-shared"><span className="fine">{t('fu.shared')}</span>{p.shares.map((s) => <span key={s} className="chip">{s}</span>)}</div>
      <Src k="vitals" time={p.last} />
    </GlassCard>
  )
}

function FlagItem({ f }: { f: PatientFlag }) {
  const { t } = useTranslation('patients')
  const row = useRowOpen(f.entry)
  return (
    <li {...row}>
      <i style={{ background: TONE_VAR[f.tone] }} />
      <span><b style={{ fontWeight: 500 }}><EntryLink entry={f.entry}>{f.title}</EntryLink></b><small>{f.detail}</small></span>
      <span className={`pill ${f.tone}`}>{t(`fu.flagTone.${f.tone}`)}</span>
    </li>
  )
}

function Flags() {
  const { t } = useTranslation('patients')
  const { patient: p } = useRecord()
  return (
    <GlassCard span={6}>
      <Head title={t('fu.flagsTitle')} meta={t('fu.flagsMeta')} />
      <ul className="pt-flags">{p.flags.map((f) => <FlagItem key={f.title} f={f} />)}</ul>
      <Src k="flags" />
    </GlassCard>
  )
}

function TaskItem({ id, task, done, onToggle }: { id: string; task: PatientTask; done: boolean; onToggle: (v: boolean) => void }) {
  const { t } = useTranslation('patients')
  return (
    <li className={done ? 'dn' : undefined}>
      <input type="checkbox" id={id} checked={done} aria-label={t('fu.taskDone', { title: task.title })} onChange={(e) => onToggle(e.target.checked)} />
      <span className="t"><EntryLink entry={task.entry}>{task.title}</EntryLink><small>{task.detail}</small></span>
    </li>
  )
}

function Tasks() {
  const { t } = useTranslation('patients')
  const toast = useToast()
  const { patient: p, session } = useRecord()
  const [text, setText] = useState('')
  const all = [...p.tasks, ...(session.added[p.id] ?? [])]
  const isDone = (i: number) => session.done[`${p.id}:${i}`] ?? all[i].done
  const open = all.filter((_, i) => !isDone(i)).length
  const add = () => {
    const v = text.trim()
    if (!v) return
    session.addTask(p.id, { title: v, detail: t('fu.taskAdded'), done: false })
    setText('')
    toast(t('fu.taskToast'))
  }
  return (
    <GlassCard span={6}>
      <Head title={t('fu.tasksTitle')} meta={t('fu.tasksMeta', { n: open })} />
      <ul className="pt-tasks">
        {all.map((task, i) => <TaskItem key={`${i}:${task.title}`} id={`pt-task-${p.id}-${i}`} task={task} done={isDone(i)} onToggle={(v) => session.setDone(`${p.id}:${i}`, v)} />)}
      </ul>
      <div className="pt-add">
        <input className="pt-in" value={text} placeholder={t('fu.taskPlaceholder')} aria-label={t('fu.taskPlaceholder')} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
        <button type="button" className="btn sm" onClick={add}>{t('fu.taskAdd')}</button>
      </div>
      <Src k="tasks" />
    </GlassCard>
  )
}

function Timeline() {
  const { t } = useTranslation('patients')
  const toast = useToast()
  const { patient: p, session } = useRecord()
  const [text, setText] = useState('')
  const items = [...(session.notes[p.id] ?? []), ...p.timeline]
  const save = () => {
    const v = text.trim()
    if (!v) return
    session.addNote(p.id, { when: t('fu.justNow'), text: t('fu.noteEntry', { text: v }) })
    setText('')
    toast(t('fu.noteToast'))
  }
  return (
    <GlassCard span={12}>
      <Head title={t('fu.tlTitle')} meta={t('fu.tlMeta')} />
      <ul className="pt-tl">
        {items.map((x, i) => <TimelineItem key={`${i}:${x.text}`} when={x.when} text={x.text} entry={x.entry} />)}
      </ul>
      <textarea className="pt-in pt-note" value={text} placeholder={t('fu.notePlaceholder', { name: p.name.split(/\s+/)[0] })} aria-label={t('fu.noteAria')} onChange={(e) => setText(e.target.value)} />
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn sm" onClick={save}>{t('fu.noteSave')}</button>
        <span className="fine">{t('fu.noteFine')}</span>
      </div>
      <Src k="timeline" />
    </GlassCard>
  )
}

function TimelineItem({ when, text, entry }: { when: string; text: string; entry?: string }) {
  const row = useRowOpen(entry)
  return (
    <li {...row}>
      <span className="tm">{when}</span>
      <span className="dot" />
      <span><EntryLink entry={entry}>{text}</EntryLink></span>
    </li>
  )
}

/** Step 6: how the patient is doing at home, from the data they share. */
export function FollowUpStep() {
  return (
    <>
      <Header />
      <Home />
      <Flags />
      <Tasks />
      <Timeline />
    </>
  )
}
