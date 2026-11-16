'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { TableScroll } from '@/components/ui/TableScroll'
import { EntryLink, Head, Src, ToneList } from './parts'
import { useRecord, useRowOpen } from './context'

const STAGE_KEYS = ['bef', 'sym', 'res', 'tx', 'rec'] as const
const STAGE_COLOURS = ['#c88a05', '#d9443f', '#2f6fb0', '#0b7f71', '#1f9d57']
/** The heading text of each stage: the darker (night: lighter) tone of the same hue, readable on the glass. */
const STAGE_TEXT = ['var(--warn-text)', 'var(--bad-text)', 'var(--brand-text)', 'var(--brand-text)', 'var(--good-text)']

/** `Clinical summary` (Moza only): the one-line handover, the numbers, diagnoses, medicines, recovery, to-do and risks. */
function Glance() {
  const { t } = useTranslation('patients')
  const { data: { moza: m } } = useRecord()
  return (
    <GlassCard span={12} className="pt-glance">
      <Head title={<><Glyph name="file" />{t('glance.title')}</>} meta={t('glance.meta')} />
      <p className="pt-one">{m.oneLine}</p>
      <div className="pt-stats">
        {m.stats.map((s) => <div key={s.label}><small>{s.label}</small><b className="n">{s.value}</b><em>{s.note}</em></div>)}
      </div>
      <div className="pt-cols">
        <section>
          <h3>{t('glance.diagnoses')}</h3>
          <ToneList items={m.diagnoses} />
          <h4>{t('glance.past')}</h4>
          <ToneList items={m.past} />
          <p className="pt-allergy"><b>{t('glance.allergy')}</b> <span>{m.allergy}</span></p>
        </section>
        <section>
          <h3>{t('glance.treatment')}</h3>
          <ToneList items={m.treatment} />
        </section>
        <section>
          <h3>{t('glance.recovery')}</h3>
          <ToneList items={m.recovery} />
          <h3 style={{ marginBlockStart: 14 }}>{t('glance.todo')}</h3>
          <ToneList items={m.todo} />
        </section>
      </div>
      <h3>{t('glance.risks')}</h3>
      <TableScroll>
        <table className="pt-risk">
          <thead><tr><th>{t('glance.risk')}</th><th>{t('glance.why')}</th><th>{t('glance.inPlace')}</th></tr></thead>
          <tbody>
            {m.risks.map((r) => <RiskRow key={r.risk} r={r} />)}
          </tbody>
        </table>
      </TableScroll>
      <Src k="glance" />
    </GlassCard>
  )
}

function RiskRow({ r }: { r: { tone: string; risk: string; why: string; inPlace: string; entry?: string } }) {
  const row = useRowOpen(r.entry)
  return (
    <tr {...row}>
      <td><span className={`pill ${r.tone}`}><EntryLink entry={r.entry}>{r.risk}</EntryLink></span></td>
      <td>{r.why}</td>
      <td>{r.inPlace}</td>
    </tr>
  )
}

/** Discharge banner with the two shortcuts (Moza only). */
function Banner() {
  const { t } = useTranslation('patients')
  const { setStep } = useRecord()
  return (
    <GlassCard span={12}>
      <div className="pt-banner">
        <span><b><Glyph name="circle-check" />{t('banner.title')}</b><small className="meta">{t('banner.text')}</small></span>
        <span className="row">
          <button type="button" className="btn" onClick={() => setStep('fu')}><Glyph name="trend" />{t('banner.data')}</button>
          <button type="button" className="btn soft" onClick={() => setStep('tx')}><Glyph name="notebook-pen" />{t('banner.plan')}</button>
        </span>
      </div>
    </GlassCard>
  )
}

/** `The case: symptoms → results → treatment` (Moza only): five stages, each opens its entry. */
function Journey() {
  const { t } = useTranslation('patients')
  const { data: { moza: m }, openEntry } = useRecord()
  return (
    <GlassCard span={12}>
      <Head title={<><Glyph name="target" />{t('journey.title')}</>} meta={t('journey.meta')} />
      <ol className="pt-journey">
        {m.journey.map((j, i) => (
          <li key={j.title} style={{ '--c': STAGE_COLOURS[i], '--t': STAGE_TEXT[i] } as React.CSSProperties} onClick={() => openEntry(j.entry)}>
            <span className="k">{i + 1} · {t(`stages.${STAGE_KEYS[i]}`)}</span>
            <b><EntryLink entry={j.entry}>{j.title}</EntryLink></b>
            <small>{j.when}</small>
            <ul>{j.lines.map((x) => <li key={x}>{x}</li>)}</ul>
          </li>
        ))}
      </ol>
      <Src k="journey" />
    </GlassCard>
  )
}

/** `Patient summary`: why the patient is under care, where, which department and doctor. */
function PatientSummary({ span }: { span: 7 | 12 }) {
  const { t } = useTranslation('patients')
  const { patient: p } = useRecord()
  const rows: [string, string][] = [
    [t('sum.why'), p.why], [t('sum.where'), p.day], [t('sum.setting'), p.setting.label], [t('sum.dept'), p.dept],
    [t('sum.doc'), p.doc], [t('sum.lang'), p.lang], [t('sum.area'), p.area], [t('sum.mrn'), p.mrn],
  ]
  return (
    <GlassCard span={span}>
      <Head title={t('sum.title')}><Pill tone={p.status.tone}>{p.status.label}</Pill></Head>
      <div className="pt-kv">{rows.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><span>{k}</span><b>{v}</b></div>)}</div>
      <Src k="summary" />
    </GlassCard>
  )
}

function Shared() {
  const { t } = useTranslation('patients')
  const { patient: p } = useRecord()
  return (
    <GlassCard span={5}>
      <Head title={t('sum.sharedTitle')} meta={t('sum.sharedMeta')} />
      <ul className="pt-chips">{p.shares.map((s) => <li key={s}>{s}</li>)}</ul>
      <p className="fine">{t('sum.sharedFine', { last: p.last })}</p>
      <Src k="shared" />
    </GlassCard>
  )
}

function Admission() {
  const { t } = useTranslation('patients')
  const { data: { moza: m } } = useRecord()
  return (
    <GlassCard span={5}>
      <Head title={t('adm.title')} meta={t('adm.meta')} />
      <div className="pt-kv">{m.admission.map((r) => <div key={r.label} style={{ display: 'contents' }}><span>{r.label}</span><b>{r.value}</b></div>)}</div>
      <Src k="adm" />
    </GlassCard>
  )
}

/** Step 1: the clinical summary for Moza, the one-page summary for everyone else. */
export function SummaryStep() {
  const { patient: p } = useRecord()
  if (p.id === 'moza') {
    return (
      <>
        <Glance />
        <Banner />
        <Journey />
        <PatientSummary span={7} />
        <Admission />
      </>
    )
  }
  return (
    <>
      <PatientSummary span={7} />
      <Shared />
    </>
  )
}
