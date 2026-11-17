'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { TableScroll } from '@/components/ui/TableScroll'
import { useToast } from '@/components/ui/Toast'
import type { EpisodeAccess } from '@/data/patients.types'
import { Head, Src } from './parts'
import { useRecord } from './context'

const TONE: Record<EpisodeAccess, string> = { own: 'good', hie: 'good', notes: 'warn', request: 'plain' }

/** The episodes of care across Abu Dhabi: each opens to its note, its access and, where the note is not shared, the requests. */
function Episodes() {
  const { t } = useTranslation('patients')
  const toast = useToast()
  const { patient: p, gender, session, openEntry } = useRecord()
  const ask = (key: string, who: string) => {
    session.request(key)
    toast(who === 'patient' ? t('his.toastPatient') : who === 'relative' ? t('his.toastRelative') : t('his.toastHospital', { where: who }))
  }
  return (
    <GlassCard span={7} tour="chart-episodes">
      <Head title={t('his.title', { context: gender })} meta={p.episodes.length === 1 ? t('his.countOne') : t('his.countMany', { n: p.episodes.length })} />
      <div className="pt-eps">
        {p.episodes.map((e, i) => {
          const key = `${p.id}:${i}`
          const asked = session.requested.has(key)
          const entry = e.entry
          return (
            <details key={key} className="pt-ep" open={i === 0 ? true : undefined}>
              <summary>
                <span className="d n">{e.when}</span>
                <span className="m"><b>{e.title}</b><small>{e.where} · {e.kind}</small></span>
                <span className={`pill ${TONE[e.access]}`}>{t(`his.kinds.${e.access}.label`)}</span>
              </summary>
              <div className="b">
                <p>{e.note}</p>
                <p className="fine"><b>{t('his.access')}</b> <span>{t('his.accessLine', { label: t(`his.kinds.${e.access}.label`), how: t(`his.kinds.${e.access}.how`) })}</span></p>
                {(e.access === 'notes' || e.access === 'request') && (asked
                  ? <span className="pill warn">{t('his.requested')}</span>
                  : (
                    <div className="row">
                      <button type="button" className="btn sm soft" onClick={() => ask(key, e.where)}>{e.access === 'notes' ? t('his.reqNotes', { where: e.where }) : t('his.reqClinic')}</button>
                      <button type="button" className="btn sm soft" onClick={() => ask(key, 'patient')}>{t('his.reqPatient')}</button>
                    </div>
                  ))}
                {entry && <button type="button" className="btn sm soft" onClick={() => openEntry(entry)}>{t('entry.open')}</button>}
              </div>
            </details>
          )
        })}
      </div>
      <Src k="eps" />
    </GlassCard>
  )
}

/** `Who holds her records`: the five places a record can live and how each is reached. */
function Holders() {
  const { t } = useTranslation('patients')
  const { gender } = useRecord()
  const rows = t('his.holders', { returnObjects: true }) as unknown as { tone: string; title: string; text_f: string; text_m: string }[]
  return (
    <GlassCard span={5}>
      <Head title={t('his.holdersTitle', { context: gender })} />
      <ul className="list">
        {rows.map((r) => (
          <li key={r.title}>
            <span className="li" style={{ color: `var(--${r.tone})` }} aria-hidden="true">●</span>
            <span><b>{r.title}</b><small>{gender === 'f' ? r.text_f : r.text_m}</small></span>
          </li>
        ))}
      </ul>
      <p className="fine">{t('his.emergency')}</p>
      <Src k="access" />
    </GlassCard>
  )
}

/** Family history from Health Lineage, only with each relative's consent. */
function Family() {
  const { t } = useTranslation('patients')
  const toast = useToast()
  const { patient: p, session } = useRecord()
  if (!p.family.length) {
    return (
      <GlassCard span={7}>
        <Head title={t('his.familyTitle')} />
        <p className="fine">{t('his.familyNone')}</p>
      </GlassCard>
    )
  }
  return (
    <GlassCard span={7}>
      <Head title={t('his.familyTitle')} meta={t('his.familyMeta')} />
      <TableScroll>
        <table style={{ minWidth: 0 }}>
          <thead><tr><th>{t('his.head.relative')}</th><th>{t('his.head.conditions')}</th><th>{t('his.head.consent')}</th></tr></thead>
          <tbody>
            {p.family.map((f, i) => {
              const key = `${p.id}:f${i}`
              return (
                <tr key={f.who}>
                  <td><b style={{ fontWeight: 500 }}>{f.who}</b></td>
                  <td>{f.conditions}</td>
                  <td>
                    {f.state === 'shared'
                      ? <span className="pill good">{f.consent}</span>
                      : session.requested.has(key)
                        ? <span className="pill warn">{t('his.asked')}</span>
                        : <button type="button" className="btn sm soft" onClick={() => { session.request(key); toast(t('his.toastRelative')) }}>{t('his.ask')}</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
      <Src k="family" />
    </GlassCard>
  )
}

function NoaUse() {
  const { t } = useTranslation('patients')
  const { patient: p } = useRecord()
  return (
    <GlassCard span={5}>
      <Head title={t('his.noaTitle')} meta={t('his.noaMeta')} />
      <ul className="pt-why">{p.noaUse.map((x) => <li key={x}>{x}</li>)}</ul>
      <p className="fine">{t('his.noaFine')}</p>
      <Src k="noa" />
    </GlassCard>
  )
}

/** Step 2. */
export function HistoryStep() {
  return (
    <>
      <Episodes />
      <Holders />
      <Family />
      <NoaUse />
    </>
  )
}
