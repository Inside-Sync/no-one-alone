import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/components/ui/Toast'
import type { RecoveryRequest } from '@/data/contract'
import { deliverySteps, todayTasks } from '@/domain/recovery'
import { Head } from '../../individual/home/parts'
import { useLiveIncident } from '@/state/LiveIncident'

const DEFAULT_PLAN: RecoveryRequest = {
  staffName: 'Dr Nguyen, Sydney Stroke Center',
  diagnosis: 'Ischaemic stroke, treated with clot-busting medicine',
  meds: [
    { name: 'aspirin', dose: '100 mg', times: ['08:00'] },
    { name: 'atorvastatin', dose: '40 mg', times: ['20:00'] },
    { name: 'amlodipine', dose: '5 mg', times: ['18:00'] },
  ],
  activities: [
    { text: 'Walk for 15 minutes with your stick', times: ['10:00', '16:00'] },
    { text: 'Check your blood pressure', times: ['08:15', '18:15'] },
    { text: 'Speech exercises from your sheet', times: ['14:00'] },
    { text: 'Drink a glass of water', times: ['11:00', '16:00'] },
  ],
  followUps: [
    { text: 'GP check with Dr Patel', inDays: 7 },
    { text: 'Stroke clinic review', inDays: 42 },
  ],
  notes: 'No driving for 4 weeks. Call 000 at once if face, arm or speech changes again.',
}

const labelStyle = { display: 'grid', gap: 3, flex: '1 1 160px', fontSize: 12, color: 'var(--ink2)' } as const
const inputStyle = { padding: '7px 10px', borderRadius: 10, border: '1px solid var(--ink2)', background: 'var(--glass-2)', color: 'var(--ink)' } as const

/** Editable form state: times are plain comma-separated text until sent. */
interface Form {
  staffName: string
  diagnosis: string
  notes: string
  meds: { name: string; dose: string; times: string }[]
  activities: { text: string; times: string }[]
  followUps: { text: string; inDays: string }[]
}

const toForm = (p: RecoveryRequest): Form => ({
  ...p,
  meds: p.meds.map((m) => ({ ...m, times: m.times.join(', ') })),
  activities: p.activities.map((a) => ({ ...a, times: a.times.join(', ') })),
  followUps: p.followUps.map((f) => ({ ...f, inDays: String(f.inDays) })),
})

const split = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

const toRequest = (f: Form): RecoveryRequest => ({
  staffName: f.staffName.trim(),
  diagnosis: f.diagnosis.trim(),
  notes: f.notes.trim(),
  meds: f.meds.map((m) => ({ name: m.name.trim(), dose: m.dose.trim(), times: split(m.times) })),
  activities: f.activities.map((a) => ({ text: a.text.trim(), times: split(a.times) })),
  followUps: f.followUps.map((u) => ({ text: u.text.trim(), inDays: Number(u.inDays) })),
})

/** `Recovery plan` (c12): staff fill in the plan and send the person home (contract 4.1). */
export function RecoveryCard() {
  const { t } = useTranslation('hospital')
  const { incident, people, recover } = useLiveIncident()
  const toast = useToast()
  const [form, setForm] = useState(() => toForm(DEFAULT_PLAN))
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

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const row = <K extends 'meds' | 'activities' | 'followUps'>(k: K, i: number, patch: Partial<Form[K][number]>) =>
    set(k, form[k].map((r, j) => (j === i ? { ...r, ...patch } : r)) as Form[K])

  const send = async () => {
    setBusy(true)
    try {
      await recover(toRequest(form))
      setSent(true)
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : t('ed.recovery.failed'))
    } finally {
      setBusy(false)
    }
  }

  if (recovery || sent) {
    const at = recovery && new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(recovery.createdAt))
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
  return (
    <GlassCard span={12}>
      <Head title={t('ed.recovery.title')} meta={t('ed.recovery.meta')} />
      {text(t('ed.recovery.staff'), form.staffName, (v) => set('staffName', v))}
      {text(t('ed.recovery.diagnosis'), form.diagnosis, (v) => set('diagnosis', v))}
      <h3>{t('ed.recovery.meds')}</h3>
      {form.meds.map((m, i) => (
        <div className="row" key={i}>
          {text(t('ed.recovery.medName', n(i)), m.name, (v) => row('meds', i, { name: v }))}
          {text(t('ed.recovery.medDose', n(i)), m.dose, (v) => row('meds', i, { dose: v }))}
          {text(t('ed.recovery.medTimes', n(i)), m.times, (v) => row('meds', i, { times: v }))}
        </div>
      ))}
      <h3>{t('ed.recovery.activities')}</h3>
      {form.activities.map((a, i) => (
        <div className="row" key={i}>
          {text(t('ed.recovery.actText', n(i)), a.text, (v) => row('activities', i, { text: v }))}
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
      {text(t('ed.recovery.notes'), form.notes, (v) => set('notes', v))}
      <p className="meta">{t('ed.recovery.hint')}</p>
      <button type="button" className="btn" disabled={busy} onClick={send}>{busy ? t('ed.recovery.delivering') : t('ed.recovery.send')}</button>
    </GlassCard>
  )
}
