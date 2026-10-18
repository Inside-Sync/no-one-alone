import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@/app/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph, Icon, type IconName } from '@/components/ui/Icon'
import { TableScroll } from '@/components/ui/TableScroll'
import { useToast } from '@/components/ui/Toast'
import type { MedChange, RecoveryRequest } from '@/data/contract'
import { CALL_DAYS, SLOTS, addDays, daysBetween, deliverySteps, localDay, taskIcon, todayTasks } from '@/domain/recovery'
import { Head } from '../../individual/home/parts'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import './plan.css'

const DEFAULT_PLAN: RecoveryRequest = {
  staffName: 'Dr Amelia Ross, stroke registrar',
  diagnosis: 'Ischaemic stroke, thrombolysed · new paroxysmal AF',
  meds: [
    { name: 'Apixaban', dose: '5 mg', times: ['08:00', '18:00'], change: 'New', note: 'Stops clots forming because of the uneven heartbeat. Replaces aspirin.' },
    { name: 'Perindopril', dose: '4 mg', times: ['08:00'], change: 'New', note: 'Lowers blood pressure and protects the brain.' },
    { name: 'Atorvastatin', dose: '40 mg', times: ['21:00'], change: 'Increased', note: 'Lowers cholesterol. Dose raised from 20 mg.' },
    { name: 'Amlodipine', dose: '5 mg', times: ['18:00'], change: 'Continue', note: 'Blood pressure tablet, as before.' },
    { name: 'Vitamin D', dose: '1000 IU', times: ['08:00'], change: 'Continue', note: 'For bones, as before.' },
    { name: 'Aspirin', dose: '100 mg', times: [], change: 'Stop', note: 'Stop taking this. Apixaban does its job now.' },
  ],
  activities: [
    { text: 'Walk 20 minutes daily', times: ['10:00'], reminder: 'Time for your 20-minute walk.' },
    { text: 'Check blood pressure morning and evening, target under 130/80', times: ['08:15', '18:15'], reminder: 'Time to check your blood pressure. Aim for under 130/80.' },
    { text: 'Speech exercises 15 minutes', times: ['14:00'], reminder: 'Time for your speech exercises, 15 minutes.' },
    { text: 'Drink 1.5 L of water a day', times: ['11:00', '16:00'], reminder: 'Time for a glass of water.' },
    { text: 'Low-salt food, under 5 g a day', times: [] },
    { text: 'No driving for 1 month', times: [] },
    { text: 'Call 000 straight away if face drooping, arm weakness or speech trouble', times: [] },
  ],
  followUps: [
    // Counted from the story's discharge night, 16 Oct: GP Fri 23 Oct, physio Tue 20 Oct.
    { text: 'GP review with Dr Patel at 10:30', inDays: 7 },
    { text: 'Physio home visit', inDays: 4 },
    { text: 'Speech pathology, weekly for 6 weeks', inDays: 6 },
    { text: 'Stroke clinic, Camperdown at 09:00', inDays: 45 },
    { text: 'Blood test (kidneys, on apixaban)', inDays: 7 },
  ],
  notes: 'You had a small stroke on 15 October. The hospital treated it quickly and you are recovering well. They also found your heartbeat is sometimes uneven, so there is a new tablet to stop clots.',
}

type ListKey = 'meds' | 'activities' | 'followUps'

/** Reminder times the doctor can pick for an instruction: every quarter hour from 06:00 to 22:00. */
const TIME_CHOICES = Array.from({ length: 65 }, (_, i) => `${String(6 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`)

const CHANGES: MedChange[] = ['New', 'Increased', 'Continue', 'Stop']

/** Editable form state: medicine times are the ticked slots, activity times are picked one by one, visits are dates. */
export interface Form {
  staffName: string
  diagnosis: string
  notes: string
  meds: { name: string; dose: string; times: string[]; change: MedChange; note: string }[]
  activities: { text: string; times: string[]; reminder?: string }[]
  /** `date`: the visit's local date, picked on a calendar; sent as days from today. */
  followUps: { text: string; date: string }[]
}

const toForm = (p: RecoveryRequest, today: string): Form => ({
  ...p,
  meds: p.meds.map((m) => ({ ...m, change: m.change ?? 'Continue', note: m.note ?? '' })),
  activities: p.activities.map((a) => ({ ...a, times: [...a.times].sort() })),
  followUps: p.followUps.map((f) => ({ text: f.text, date: addDays(today, f.inDays) })),
})

/** What stops a row from being signed, as an `ed.recovery.errors` key. */
export type Problem = 'nameMissing' | 'doseMissing' | 'noTimes' | 'textMissing' | 'badDays'
export type Problems = { meds: (Problem | null)[]; activities: (Problem | null)[]; followUps: (Problem | null)[] }

/** core-api's limits (Recovery.validate): rows per list, and days to a follow-up. */
export const MAX_ROWS = { meds: 10, activities: 10, followUps: 5 } as const
const MAX_DAYS = 365

/** Row by row, as core-api checks it: a medicine needs a name, a dose and, unless stopped, a time; instructions need text; visits fall 1 to 365 days ahead. */
export function planProblems(f: Form, today: string): Problems {
  return {
    meds: f.meds.map((m) => (!m.name.trim() ? 'nameMissing' : !m.dose.trim() ? 'doseMissing' : m.change !== 'Stop' && !m.times.length ? 'noTimes' : null)),
    activities: f.activities.map((a) => (!a.text.trim() ? 'textMissing' : null)),
    followUps: f.followUps.map((u) => {
      const d = u.date ? daysBetween(today, u.date) : NaN
      return !u.text.trim() ? 'textMissing' : !(d >= 1 && d <= MAX_DAYS) ? 'badDays' : null
    }),
  }
}

const hasProblems = (p: Problems) => [...p.meds, ...p.activities, ...p.followUps].some(Boolean)

/** A row the doctor adds: a new medicine has no times yet, so it cannot be signed until one is ticked. */
const BLANK = {
  meds: { name: '', dose: '', times: [], change: 'New' as MedChange, note: '' },
  activities: { text: '', times: [] },
  followUps: { text: '', date: '' },
} as const

const toRequest = (f: Form, today: string): RecoveryRequest => ({
  staffName: f.staffName.trim(),
  diagnosis: f.diagnosis.trim(),
  notes: f.notes.trim(),
  meds: f.meds.map((m) => ({
    name: m.name.trim(), dose: m.dose.trim(), times: m.change === 'Stop' ? [] : [...m.times].sort(), change: m.change, ...(m.note.trim() ? { note: m.note.trim() } : {}),
  })),
  activities: f.activities.map((a) => ({ text: a.text.trim(), times: [...a.times].sort(), ...(a.reminder ? { reminder: a.reminder } : {}) })),
  followUps: f.followUps.map((u) => ({ text: u.text.trim(), inDays: daysBetween(today, u.date) })),
})

/** The plan being written on the patient page: shared by the fit-for-discharge banner and the plan card. */
export function usePlanBuilder() {
  const { t } = useTranslation('hospital')
  const { people, recover, recovery } = useLiveIncident()
  const toast = useToast()
  const tz = people.person?.timezone ?? 'Australia/Sydney'
  // Today in the person's timezone: visits are picked as dates and sent as days from it.
  const [today] = useState(() => localDay(Date.now(), tz)) // layering-allow: the real date the plan is written
  const [form, setForm] = useState(() => toForm(DEFAULT_PLAN, today))
  const [signedAt, setSignedAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  // Problems show once the doctor tries to sign, then follow every edit.
  const [checked, setChecked] = useState(false)
  const problems = planProblems(form, today)
  const clock = (ms: number) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms)

  /** Signs the plan when every row is complete; otherwise marks the rows to fix. */
  const sign = () => {
    setChecked(true)
    if (hasProblems(problems)) {
      toast(t('ed.recovery.toastFix'))
      document.querySelector('#planBuilder [aria-invalid="true"]')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      return false
    }
    setSignedAt(clock(Date.now())) // layering-allow: the doctor's real signing time
    return true
  }

  const finalise = () => {
    if (sign()) toast(t('ed.recovery.toastFinal'))
  }

  const send = async () => {
    setBusy(true)
    try {
      await recover(toRequest(form, today))
      setSent(true)
      toast(t('ed.recovery.toastSent'))
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : t('ed.recovery.failed'))
    } finally {
      setBusy(false)
    }
  }

  /** The banner's one-click approval: the doctor signs and hands off in the same step. */
  const approve = async () => {
    if (!signedAt && !sign()) return
    await send()
  }

  return { form, setForm, signedAt, setSignedAt, busy, sent, recovery, people, clock, finalise, send, approve, today, problems: checked ? problems : null }
}

export type PlanBuilder = ReturnType<typeof usePlanBuilder>

/** `Margaret Collins is fit for discharge` (c12 sendbar): approve from the top, jump to the plan, then open her portal. */
export function FitBanner({ plan }: { plan: PlanBuilder }) {
  const { t } = useTranslation('hospital')
  const router = useRouter()
  const { setWho } = useAppState()
  const done = Boolean(plan.recovery || plan.sent)
  const at = plan.recovery && plan.clock(Date.parse(plan.recovery.createdAt))
  const openPortal = () => {
    setWho('self')
    router.push('/individual/recovery')
  }
  return (
    <GlassCard span={12}>
      <div className="row" style={{ borderLeft: '4px solid var(--brand)', paddingLeft: 14, justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          <b style={{ fontSize: 16 }}><Glyph name="stethoscope" />{t('patient.banner.title')}</b>
          <small className="meta" style={{ display: 'block' }}>{t('patient.banner.sub')}</small>
        </span>
        <span className="row">
          <button type="button" className="btn" disabled={done || plan.busy} onClick={plan.approve}>
            <Glyph name={done ? 'check' : 'circle-check'} />
            {done ? t('patient.banner.sent', { time: at ?? '' }) : plan.busy ? t('ed.recovery.delivering') : t('patient.banner.approve')}
          </button>
          <button type="button" className="btn soft" onClick={() => document.getElementById('planBuilder')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <Glyph name="arrow-down" />{t('patient.banner.review')}
          </button>
          {done && <button type="button" className="btn soft" onClick={openPortal}><Glyph name="user-round" />{t('patient.banner.portal')}</button>}
        </span>
      </div>
    </GlassCard>
  )
}

/** `Discharge and recovery plan` (c12): the doctor finalises the plan, then approves it and Noa delivers it (contract 4.1). */
export function RecoveryCard({ plan }: { plan: PlanBuilder }) {
  const { t } = useTranslation('hospital')
  const { form, setForm, signedAt, setSignedAt, busy, sent, recovery, people, clock, finalise, send, today, problems } = plan
  const [shown, setShown] = useState(0)
  // The row just added takes the focus, so the doctor can type straight away.
  const [added, setAdded] = useState<{ k: ListKey; i: number } | null>(null)
  const steps = recovery ? deliverySteps(recovery, Object.values(people.members).map((p) => p.displayName.split(' ')[0])) : []
  const visible = sent ? shown : steps.length
  useEffect(() => {
    if (!recovery || !sent || shown >= steps.length) return
    const id = setTimeout(() => setShown(shown + 1), 550)
    return () => clearTimeout(id)
  }, [recovery, sent, shown, steps.length])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const row = <K extends ListKey>(k: K, i: number, patch: Partial<Form[K][number]>) =>
    set(k, form[k].map((r, j) => (j === i ? { ...r, ...patch } : r)) as Form[K])
  const add = (k: ListKey) => {
    setAdded({ k, i: form[k].length })
    set(k, [...form[k], { ...BLANK[k], ...(k === 'meds' ? { times: [] } : {}) }] as Form[typeof k])
  }
  const remove = (k: ListKey, i: number) => {
    setAdded(null)
    set(k, form[k].filter((_, j) => j !== i) as Form[typeof k])
  }
  const focus = (k: ListKey, i: number) => added?.k === k && added.i === i
  const problem = (k: ListKey, i: number) => problems?.[k][i] ?? null
  const err = (k: ListKey, i: number) => {
    const p = problem(k, i)
    return p && <small className="plan-err" id={`plan-err-${k}-${i}`} role="alert">{t(`ed.recovery.errors.${p}`)}</small>
  }
  const invalid = (k: ListKey, i: number, which: Problem[]) => {
    const p = problem(k, i)
    return p && which.includes(p) ? { 'aria-invalid': true as const, 'aria-describedby': `plan-err-${k}-${i}` } : {}
  }
  const label = (k: ListKey, i: number) => (k === 'meds' ? form.meds[i].name : k === 'activities' ? form.activities[i].text : form.followUps[i].text).trim() || t('ed.recovery.thisRow')
  const addBtn = (k: ListKey, text: string) => {
    const full = form[k].length >= MAX_ROWS[k]
    return (
      <>
        <button type="button" className="btn soft sm" disabled={full} onClick={() => add(k)}><Icon name="plus" />{text}</button>
        {full && <span className="plan-hint">{t('ed.recovery.full', { n: MAX_ROWS[k] })}</span>}
      </>
    )
  }
  const removeBtn = (k: ListKey, i: number) => (
    <button type="button" className="plan-x" aria-label={t('ed.recovery.remove', { what: label(k, i) })} title={t('ed.recovery.remove', { what: label(k, i) })} onClick={() => remove(k, i)}>
      <Icon name="x" />
    </button>
  )

  if (recovery || sent) {
    const at = recovery && clock(Date.parse(recovery.createdAt))
    const done = recovery && visible >= steps.length
    return (
      <GlassCard span={12} id="planBuilder" className="plan">
        <Head icon="notebook-pen" title={t('ed.recovery.title')} meta={at ? t('ed.recovery.sentAt', { time: at }) : t('ed.recovery.sent')} />
        <div className="plan-sent">
          <section>
            <h3 className="plan-h">{t('ed.recovery.stepsTitle')}</h3>
            <ol className="steps plan-steps" aria-live="polite">
              {steps.slice(0, visible).map((s) => <li key={s.key}><b><Icon name="check" /></b><span>{t(`ed.recovery.steps.${s.key}`, s.vars)}</span></li>)}
            </ol>
          </section>
          {done && (
            <section>
              <h3 className="plan-h">{t('ed.recovery.remindersTitle')}<span className="plan-count">{todayTasks(recovery).length}</span></h3>
              <ol className="plan-day">
                {todayTasks(recovery).map((x) => (
                  <li key={x.id} data-kind={x.kind}>
                    <time>{x.time}</time>
                    <span className="plan-dot"><Icon name={taskIcon(x)} /></span>
                    <span><b>{x.title}</b>{x.why && <small>{t('ed.recovery.why', { text: x.why })}</small>}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </GlassCard>
    )
  }

  const n = (i: number) => ({ n: i + 1 })
  const slots = Object.entries(SLOTS)
  const inDays = (date: string) => {
    const d = date ? daysBetween(today, date) : NaN
    return d >= 1 && d <= MAX_DAYS ? t('ed.recovery.inDays', { count: d }) : ''
  }
  const addTime = (i: number, time: string) => {
    const times = form.activities[i].times
    if (time && !times.includes(time)) row('activities', i, { times: [...times, time].sort() })
  }
  return (
    <GlassCard span={12} id="planBuilder" className="plan">
      <Head icon="notebook-pen" title={t('ed.recovery.title')} meta={t('ed.recovery.meta')} />
      <fieldset className="plan-form" disabled={signedAt !== null}>
        <div className="plan-who">
          <label><span>{t('ed.recovery.staff')}</span><input value={form.staffName} onChange={(e) => set('staffName', e.target.value)} /></label>
          <label><span>{t('ed.recovery.diagnosis')}</span><input value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} /></label>
        </div>

        <section>
          <h3 className="plan-h"><Glyph name="pill" />{t('ed.recovery.meds')}<span className="plan-count">{form.meds.length}</span></h3>
          <TableScroll>
            <table className="plan-meds">
              <thead>
                <tr>
                  <th>{t('ed.recovery.medHead')}</th>
                  <th>{t('ed.recovery.doseHead')}</th>
                  {slots.map(([time, slot]) => <th key={time} className="c">{t(`ed.recovery.slots.${slot}`)}<small>{time}</small></th>)}
                  <th>{t('ed.recovery.changeHead')}</th>
                  <th>{t('ed.recovery.noteHead')}</th>
                  <th><span className="sr">{t('ed.recovery.removeHead')}</span></th>
                </tr>
              </thead>
              <tbody>
                {form.meds.map((m, i) => (
                  <tr key={i} data-change={m.change} data-invalid={problem('meds', i) ? '' : undefined}>
                    <td>
                      <input className="plan-in name" aria-label={t('ed.recovery.medName', n(i))} autoFocus={focus('meds', i)} placeholder={t('ed.recovery.medPlaceholder')} value={m.name} onChange={(e) => row('meds', i, { name: e.target.value })} {...invalid('meds', i, ['nameMissing'])} />
                      {err('meds', i)}
                    </td>
                    <td><input className="plan-in dose" aria-label={t('ed.recovery.medDose', n(i))} placeholder="5 mg" value={m.dose} onChange={(e) => row('meds', i, { dose: e.target.value })} {...invalid('meds', i, ['doseMissing'])} /></td>
                    {slots.map(([time, slot]) => (
                      <td key={time} className="c">
                        <label className="plan-slot">
                          <input
                            type="checkbox"
                            aria-label={t('ed.recovery.medSlot', { ...n(i), slot: t(`ed.recovery.slots.${slot}`) })}
                            {...invalid('meds', i, ['noTimes'])}
                            checked={m.change !== 'Stop' && m.times.includes(time)}
                            disabled={m.change === 'Stop'}
                            onChange={(e) => row('meds', i, { times: e.target.checked ? [...m.times, time] : m.times.filter((x) => x !== time) })}
                          />
                          <span aria-hidden="true">{time}</span>
                        </label>
                      </td>
                    ))}
                    <td>
                      <select className="plan-change" aria-label={t('ed.recovery.medChange', n(i))} value={m.change} onChange={(e) => row('meds', i, { change: e.target.value as MedChange })}>
                        {CHANGES.map((c) => <option key={c} value={c}>{t(`ed.recovery.change.${c}`)}</option>)}
                      </select>
                    </td>
                    <td><textarea className="plan-in note" rows={2} aria-label={t('ed.recovery.medNote', n(i))} placeholder={t('ed.recovery.notePlaceholder')} value={m.note} onChange={(e) => row('meds', i, { note: e.target.value })} /></td>
                    {/* A tablet she already takes is stopped, not deleted, so Noa tells her and the pharmacy hears of it. */}
                    <td className="c">{m.change === 'New' && removeBtn('meds', i)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <div className="plan-add">
            {addBtn('meds', t('ed.recovery.addMed'))}
            <p className="plan-hint">{t('ed.recovery.keepHint')}</p>
          </div>
        </section>

        <div className="plan-cols">
          <section>
            <h3 className="plan-h"><Glyph name="footprints" />{t('ed.recovery.activities')}<span className="plan-count">{form.activities.length}</span></h3>
            <div className="plan-rows">
              <div className="plan-rowhead" aria-hidden="true"><span>{t('ed.recovery.actHead')}</span><span>{t('ed.recovery.timesHead')}</span></div>
              {form.activities.map((a, i) => (
                <div className="plan-row" key={i}>
                  <span className="plan-dot"><Icon name={instructionIcon(a.text)} /></span>
                  <input className="plan-in" aria-label={t('ed.recovery.actText', n(i))} autoFocus={focus('activities', i)} value={a.text} onChange={(e) => row('activities', i, { text: e.target.value, reminder: undefined })} {...invalid('activities', i, ['textMissing'])} />
                  <div className="plan-times" role="group" aria-label={t('ed.recovery.actTimes', n(i))}>
                    {a.times.map((x) => (
                      <span key={x} className="plan-time">
                        {x}
                        <button type="button" aria-label={t('ed.recovery.removeTime', { time: x, ...n(i) })} onClick={() => row('activities', i, { times: a.times.filter((y) => y !== x) })}><Icon name="x" /></button>
                      </span>
                    ))}
                    {!a.times.length && <span className="plan-none">{t('ed.recovery.noReminder')}</span>}
                    <TimePicker label={t('ed.recovery.addTime', n(i))} taken={a.times} onPick={(x) => addTime(i, x)} />
                  </div>
                  {removeBtn('activities', i)}
                  {err('activities', i)}
                </div>
              ))}
            </div>
            <div className="plan-add">{addBtn('activities', t('ed.recovery.addAct'))}</div>
            <p className="plan-hint">{t('ed.recovery.hint')}</p>
          </section>

          <section>
            <h3 className="plan-h"><Glyph name="calendar" />{t('ed.recovery.followUps')}<span className="plan-count">{form.followUps.length}</span></h3>
            <div className="plan-rows">
              <div className="plan-rowhead fu" aria-hidden="true"><span>{t('ed.recovery.fuHead')}</span><span>{t('ed.recovery.daysHead')}</span></div>
              {form.followUps.map((f, i) => (
                <div className="plan-row fu" key={i}>
                  <span className="plan-dot"><Icon name="calendar" /></span>
                  <input className="plan-in" aria-label={t('ed.recovery.fuText', n(i))} autoFocus={focus('followUps', i)} value={f.text} onChange={(e) => row('followUps', i, { text: e.target.value })} {...invalid('followUps', i, ['textMissing'])} />
                  <span className="plan-days">
                    <input type="date" className="plan-in" aria-label={t('ed.recovery.fuDate', n(i))} min={addDays(today, 1)} max={addDays(today, MAX_DAYS)} value={f.date} onChange={(e) => row('followUps', i, { date: e.target.value })} {...invalid('followUps', i, ['badDays'])} />
                    <small>{inDays(f.date)}</small>
                  </span>
                  {removeBtn('followUps', i)}
                  {err('followUps', i)}
                </div>
              ))}
            </div>
            <div className="plan-add">{addBtn('followUps', t('ed.recovery.addFu'))}</div>
            <h3 className="plan-h sub"><Glyph name="phone" />{t('ed.recovery.calls')}</h3>
            <div className="plan-calls">{CALL_DAYS.map((d) => <span key={d}>{t('ed.recovery.callDay', { day: d })}</span>)}</div>
          </section>
        </div>

        <label className="plan-notes"><span>{t('ed.recovery.notes')}</span><textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></label>
      </fieldset>

      <div className={signedAt ? 'plan-foot signed' : 'plan-foot'}>
        {signedAt ? (
          <span className="plan-sig">
            <span><Glyph name="pen-line" />{t('ed.recovery.signed', { name: form.staffName, time: signedAt })}</span>
            <button type="button" className="btn soft sm" disabled={busy} onClick={() => setSignedAt(null)}>{t('ed.recovery.editAgain')}</button>
          </span>
        ) : <p className="plan-hint">{t('ed.recovery.approveNote')}</p>}
        <span className="row">
          {!signedAt && <button type="button" className="btn soft" onClick={finalise}><Glyph name="pen-line" />{t('ed.recovery.finalise')}</button>}
          <button type="button" className="btn" disabled={!signedAt || busy} onClick={send}>{busy ? t('ed.recovery.delivering') : t('ed.recovery.approve')}</button>
        </span>
      </div>
      {signedAt && <p className="plan-hint">{t('ed.recovery.approveNote')}</p>}
    </GlassCard>
  )
}

/** The icon beside an instruction, by the kind of thing it asks (display only). */
function instructionIcon(text: string): IconName {
  const s = text.toLowerCase()
  if (s.includes('salt')) return 'utensils'
  if (s.includes('driv')) return 'ban'
  if (s.includes('000')) return 'siren'
  return taskIcon({ kind: 'ACTIVITY', title: text })
}

/** `+ Add time`: a dropdown list of quarter-hour times with a fixed height that scrolls; picking one adds it and closes. */
function TimePicker({ label, taken, onPick }: { label: string; taken: string[]; onPick: (time: string) => void }) {
  const { t } = useTranslation('hospital')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLSpanElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) {
        setOpen(false)
        if (e instanceof KeyboardEvent) button.current?.focus()
      }
    }
    document.addEventListener('keydown', close)
    document.addEventListener('pointerdown', close)
    // Open at the morning, where most reminders go, with focus on the first time still free from there.
    const list = box.current?.querySelector<HTMLElement>('.plan-list')
    const first = list?.querySelector<HTMLButtonElement>('[data-time="08:00"]')
    if (list && first) list.scrollTop = first.offsetTop - 4
    list?.querySelector<HTMLButtonElement>('[data-time="08:00"]:not(:disabled), [data-time="08:00"] ~ button:not(:disabled)')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('pointerdown', close)
    }
  }, [open])
  const move = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(box.current?.querySelectorAll<HTMLButtonElement>('.plan-list button:not(:disabled)') ?? [])]
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    items[Math.min(items.length - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus()
  }
  return (
    <span className="plan-tp" ref={box}>
      <button ref={button} type="button" className="plan-pick" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="plus" />{t('ed.recovery.addTimeShort')}
      </button>
      {open && (
        <span className="plan-list" role="listbox" aria-label={label} onKeyDown={move}>
          {TIME_CHOICES.map((time) => (
            <button key={time} type="button" role="option" aria-selected={false} data-time={time} disabled={taken.includes(time)} onClick={() => { onPick(time); setOpen(false); button.current?.focus() }}>
              {time}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
