'use client'

import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { TableScroll } from '@/components/ui/TableScroll'
import { useToast } from '@/components/ui/Toast'
import type { PatientResult, ReviewBlock } from '@/data/patients.types'
import { EntryLink, Head, Src } from './parts'
import { useRecord, useRowOpen } from './context'

function Row({ r }: { r: PatientResult }) {
  const { t } = useTranslation('patients')
  const row = useRowOpen(r.entry)
  return (
    <tr {...row}>
      <td><EntryLink entry={r.entry}>{r.test}</EntryLink></td>
      <td><b style={{ fontWeight: 500 }}>{r.result}</b></td>
      <td className="n">{r.when}</td>
      <td><span className={`pill ${r.tone}`}>{t(`res.tone.${r.tone}`)}</span></td>
    </tr>
  )
}

/** `Waiting for doctor review` with Noa's summary: the Results to review block, inside Khalid's record. */
function ReviewCards({ review }: { review: ReviewBlock }) {
  const { t } = useTranslation('patients')
  const toast = useToast()
  const { patient: p, session } = useRecord()
  const [sel, setSel] = useState(review.items[0].id)
  const item = review.items.find((x) => x.id === sel) ?? review.items[0]
  const full = item.name === p.name
  const sent = session.sent.has(p.id)
  return (
    <>
      <GlassCard span={4}>
        <Head title={t('review.title')} meta={t('review.meta', { n: review.items.length })} />
        <div className="pt-rv">
          {review.items.map((x) => {
            const on = x.id === item.id
            const done = x.name === p.name && sent
            return (
              <button key={x.id} type="button" className={`msg${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setSel(x.id)}>
                <span className="av" style={{ '--c': x.color } as CSSProperties}>{Array.from(x.name)[0]}</span>
                <span><b>{t('review.nameAge', { name: x.name, age: x.age })}</b><small>{x.result}</small></span>
                <Pill tone={done ? 'good' : x.tone}>{done ? t('review.confirmed') : x.tag}</Pill>
              </button>
            )
          })}
        </div>
        <p className="fine">{t('review.fine')}</p>
      </GlassCard>
      <GlassCard span={5}>
        <Head title={full ? t('review.summaryTitle') : t('review.summaryTitleOther')} meta={t('review.nameAge', { name: item.name, age: item.age })} />
        {full ? (
          <>
            <div className="pt-packet">{review.rows.map((r) => <div key={r.label}><span>{r.label}</span><b>{r.value}</b></div>)}</div>
            <Head title={t('review.suggests')} />
            <ul className="pt-check">
              {review.suggests.map((s) => <li key={s.text}><span className="bx" aria-hidden="true"><span className="ic"><Icon name="check" /></span></span><span>{s.text}</span><em>{s.note}</em></li>)}
            </ul>
            {sent ? <p className="pill good" style={{ justifySelf: 'start' }}>{t('review.sent')}</p> : (
              <div className="row">
                <button type="button" className="btn" onClick={() => { toast(t('review.sentToast')); session.send(p.id) }}>{t('review.confirm')}</button>
                <button type="button" className="btn soft" onClick={() => toast(t('review.draftToast'))}>{t('review.draft')}</button>
              </div>
            )}
          </>
        ) : <p className="fine">{t('review.other')}</p>}
      </GlassCard>
      <GlassCard span={4}>
        <Head title={t('review.whyTitle')} />
        <ul className="pt-why-list">{review.why.map((w) => <li key={w}><span className="ic"><Icon name="check" /></span><span>{w}</span></li>)}</ul>
      </GlassCard>
    </>
  )
}

/** Step 4: tests and results, flagged normal, watch or abnormal; Khalid's shows the results waiting for review instead. */
export function ResultsStep() {
  const { t } = useTranslation('patients')
  const { patient: p, data, gender } = useRecord()
  if (data.review.patient === p.id && !p.results.length) return <ReviewCards review={data.review} />
  const rows = p.id === 'moza' ? data.moza.results : p.results
  return (
    <GlassCard span={12} tour="chart-results">
      <Head title={t('res.title', { context: gender })} meta={t('res.meta')} />
      <TableScroll>
        <table>
          <thead><tr><th>{t('res.head.test')}</th><th>{t('res.head.result')}</th><th>{t('res.head.when')}</th><th><span className="pt-sr">{t('res.head.status')}</span></th></tr></thead>
          <tbody>{rows.map((r) => <Row key={r.test} r={r} />)}</tbody>
        </table>
      </TableScroll>
      <Src k={p.id === 'moza' ? 'resMoza' : 'res'} />
    </GlassCard>
  )
}
