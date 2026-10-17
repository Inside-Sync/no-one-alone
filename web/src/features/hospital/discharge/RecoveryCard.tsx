import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { TableScroll } from '@/components/ui/TableScroll'
import { useToast } from '@/components/ui/Toast'
import type { MedChange, RecoveryRequest } from '@/data/contract'
import { CALL_DAYS, SLOTS, deliverySteps, todayTasks } from '@/domain/recovery'
import { Head } from '../../individual/home/parts'
import { useLiveIncident } from '@/state/LiveIncident'

const DEFAULT_PLAN: RecoveryRequest = {
  staffName: 'Dr Amelia Ross, stroke registrar',
  diagnosis: 'Ischaemic stroke, thrombolysed · new paroxysmal AF',
  meds: [
    { name: 'Apixaban', dose: '5 mg', times: ['08:00', '18:00'], change: 'New' },
    { name: 'Perindopril', dose: '4 mg', times: ['08:00'], change: 'New' },
    { name: 'Atorvastatin', dose: '40 mg', times: ['21:00'], change: 'Increased' },
    { name: 'Amlodipine', dose: '5 mg', times: ['18:00'], change: 'Continue' },
    { name: 'Vitamin D', dose: '1000 IU', times: ['08:00'], change: 'Continue' },
    { name: 'Aspirin', dose: '100 mg', times: [], change: 'Stop' },
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

const CHANGES: MedChange[] = ['New', 'Increased', 'Continue', 'Stop']
const labelStyle = { display: 'grid', gap: 3, flex: '1 1 160px', fontSize: 12, color: 'var(--ink2)' } as const
const inputStyle = { padding: '7px 10px', borderRadius: 10, border: '1px solid var(--ink2)', background: 'var(--glass-2)', color: 'var(--ink)', minWidth: 0 } as const

/** Editable form state: activity times are comma-separated text, medicine times are the ticked slots. */
interface Form {
  staffName: string
  diagnosis: string
  notes: string
  meds: { name: string; dose: string; times: string[]; change: MedChange }[]
  activities: { text: string; times: string; reminder?: string }[]
  followUps: { text: string; inDays: string }[]
}

const toForm = (p: RecoveryRequest): Form => ({
  ...p,
  meds: p.meds.map((m) => ({ ...m, change: m.change ?? 'Continue' })),
  activities: p.activities.map((a) => ({ ...a, times: a.times.join(', ') })),
  followUps: p.followUps.map((f) => ({ ...f, inDays: String(f.inDays) })),
})

const split = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

const toRequest = (f: Form): RecoveryRequest => ({
  staffName: f.staffName.trim(),
  diagnosis: f.diagnosis.trim(),
  notes: f.notes.trim(),
  meds: f.meds.map((m) => ({ name: m.name.trim(), dose: m.dose.trim(), times: m.change === 'Stop' ? [] : [...m.times].sort(), change: m.change })),
  activities: f.activities.map((a) => ({ text: a.text.trim(), times: split(a.times), ...(a.reminder ? { reminder: a.reminder } : {}) })),
  followUps: f.followUps.map((u) => ({ text: u.text.trim(), inDays: Number(u.inDays) })),
})

/** `Discharge and recovery plan` (c12): the doctor finalises the plan, then approves it and Noa delivers it (contract 4.1). */
export function RecoveryCard() {
  const { t } = useTranslation('hospital')
  const { incident, people, recover } = useLiveIncident()
  const toast = useToast()
  const [form, setForm] = useState(() => toForm(DEFAULT_PLAN))
  const [signedAt, setSignedAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const recovery = incident?.recovery
  const [shown, setShown] = useState(0)
  const steps = recovery ? deliverySteps(recovery, Object.values(people.members).map((p) => p.displayName.split(' ')[0])) : []
  const visible = sent ? shown : steps.length
  useEffect(() => {
    if (!recovery || !sent || shown >= steps.length) return
    const id = setTimeout(() => setShown(shown + 1), 550)
    return () => clearTimeout(id)
  }, [recovery, sent, shown, steps.length])
  const tz = people.person?.timezone ?? 'Australia/Sydney'
  const clock = (ms: number) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms)

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const row = <K extends 'meds' | 'activities' | 'followUps'>(k: K, i: number, patch: Partial<Form[K][number]>) =>
    set(k, form[k].map((r, j) => (j === i ? { ...r, ...patch } : r)) as Form[K])

  const finalise = () => {
    setSignedAt(clock(Date.now())) // layering-allow: the doctor's real signing time
    toast(t('ed.recovery.toastFinal'))
  }

  const send = async () => {
    setBusy(true)
    try {
      await recover(toRequest(form))
      setSent(true)
      toast(t('ed.recovery.toastSent'))
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : t('ed.recovery.failed'))
    } finally {
      setBusy(false)
    }
  }

  if (recovery || sent) {
    const at = recovery && clock(Date.parse(recovery.createdAt))
    return (
      <GlassCard span={12}>
        <Head title={t('ed.recovery.title')} meta={at ? t('ed.recovery.sentAt', { time: at }) : t('ed.recovery.sent')} />
        <ol className="list steps">
          {steps.slice(0, visible).map((s, i) => <li key={s.key}><b>{i + 1}</b><span>{t(`ed.recovery.steps.${s.key}`, s.vars)}</span></li>)}
        </ol>
        {recovery && visible >= steps.length && (
          <ul className="list">
            {todayTasks(recovery).map((x) => (
              <li key={x.id}><b>{x.time}</b><span>{x.title}{x.why && <small className="meta" style={{ display: 'block' }}>{t('ed.recovery.why', { text: x.why })}</small>}</span></li>
            ))}
          </ul>
        )}
      </GlassCard>
    )
  }

  const n = (i: number) => ({ n: i + 1 })
  const text = (label: string, value: string, onChange: (v: string) => void) => (
    <label style={labelStyle}><span>{label}</span><input style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} /></label>
  )
  const slots = Object.entries(SLOTS)
  return (
    <GlassCard span={12} id="planBuilder">
      <Head title={t('ed.recovery.title')} meta={t('ed.recovery.meta')} />
      <fieldset disabled={signedAt !== null} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, opacity: signedAt ? 0.75 : 1 }}>
        <div className="row">
          {text(t('ed.recovery.staff'), form.staffName, (v) => set('staffName', v))}
          {text(t('ed.recovery.diagnosis'), form.diagnosis, (v) => set('diagnosis', v))}
        </div>
        <h3>{t('ed.recovery.meds')}</h3>
        <TableScroll>
          <table>
            <thead>
              <tr>
                <th>{t('ed.recovery.medHead')}</th>
                <th>{t('ed.recovery.doseHead')}</th>
                {slots.map(([time, slot]) => <th key={time}>{t(`ed.recovery.slots.${slot}`)} {time}</th>)}
                <th>{t('ed.recovery.changeHead')}</th>
              </tr>
            </thead>
            <tbody>
              {form.meds.map((m, i) => (
                <tr key={i}>
                  <td><input style={inputStyle} aria-label={t('ed.recovery.medName', n(i))} value={m.name} onChange={(e) => row('meds', i, { name: e.target.value })} /></td>
                  <td><input style={{ ...inputStyle, width: 90 }} aria-label={t('ed.recovery.medDose', n(i))} value={m.dose} onChange={(e) => row('meds', i, { dose: e.target.value })} /></td>
                  {slots.map(([time, slot]) => (
                    <td key={time} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        aria-label={t('ed.recovery.medSlot', { ...n(i), slot: t(`ed.recovery.slots.${slot}`) })}
                        checked={m.times.includes(time)}
                        onChange={(e) => row('meds', i, { times: e.target.checked ? [...m.times, time] : m.times.filter((x) => x !== time) })}
                      />
                    </td>
                  ))}
                  <td>
                    <select style={inputStyle} aria-label={t('ed.recovery.medChange', n(i))} value={m.change} onChange={(e) => row('meds', i, { change: e.target.value as MedChange })}>
                      {CHANGES.map((c) => <option key={c} value={c}>{t(`ed.recovery.change.${c}`)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <h3>{t('ed.recovery.activities')}</h3>
        {form.activities.map((a, i) => (
          <div className="row" key={i}>
            {text(t('ed.recovery.actText', n(i)), a.text, (v) => row('activities', i, { text: v, reminder: undefined }))}
            {text(t('ed.recovery.actTimes', n(i)), a.times, (v) => row('activities', i, { times: v }))}
          </div>
        ))}
        <h3>{t('ed.recovery.followUps')}</h3>
        {form.followUps.map((f, i) => (
          <div className="row" key={i}>
            {text(t('ed.recovery.fuText', n(i)), f.text, (v) => row('followUps', i, { text: v }))}
            {text(t('ed.recovery.fuDays', n(i)), f.inDays, (v) => row('followUps', i, { inDays: v }))}
          </div>
        ))}
        <h3>{t('ed.recovery.calls')}</h3>
        <div className="row">{CALL_DAYS.map((d) => <span key={d} className="chip">{t('ed.recovery.callDay', { day: d })}</span>)}</div>
        {text(t('ed.recovery.notes'), form.notes, (v) => set('notes', v))}
        <p className="meta">{t('ed.recovery.hint')}</p>
      </fieldset>
      {signedAt && (
        <p className="row" style={{ fontSize: 13, padding: '8px 12px', borderRadius: 12, background: 'rgba(31,143,95,.12)' }}>
          <span>{t('ed.recovery.signed', { name: form.staffName, time: signedAt })}</span>
          <button type="button" className="btn soft sm" disabled={busy} onClick={() => setSignedAt(null)}>{t('ed.recovery.editAgain')}</button>
        </p>
      )}
      <div className="row">
        {!signedAt && <button type="button" className="btn" onClick={finalise}>{t('ed.recovery.finalise')}</button>}
        <button type="button" className="btn" disabled={!signedAt || busy} onClick={send}>{busy ? t('ed.recovery.delivering') : t('ed.recovery.approve')}</button>
      </div>
      <p className="meta">{t('ed.recovery.approveNote')}</p>
    </GlassCard>
  )
}
