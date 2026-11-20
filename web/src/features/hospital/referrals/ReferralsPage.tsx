'use client'

import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Pill, type PillTone } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import type { ReferralItem, ScreeningData } from '@/data/types'
import type { FamilyReferral, RefReason } from '@/features/familyHealth'
import { getEngine, useSnapshot, useTexts } from '@/features/familyHealth/ui/store'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { Head } from '../../individual/home/parts'
import { useScreening } from '../loop/useScreening'

const plain = { fontWeight: 500 } as const

type Outcome = 'accepted' | 'declined'
/** One inbox row: a demo referral, or the one Noa sent from a family-health journey (`noa`). */
type Row = Pick<ReferralItem, 'id' | 'name' | 'to' | 'from' | 'tag'> & { noa?: boolean }

/** `Referral inbox` (c5): the referrals from physicians (Noa's first, when a journey sent one), one selectable row each. */
function InboxCard({ items, sel, outcome, onSelect }: { items: Row[]; sel: string; outcome: Readonly<Record<string, Outcome>>; onSelect: (id: string) => void }) {
  const { t } = useTranslation('screening')
  return (
    <GlassCard span={5}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="clinic" /></span></span>
        <h2>{t('referrals.list.title')}</h2>
        <span className="meta">{t('referrals.list.meta')}</span>
      </div>
      <div className="inbox" id="refList">
        {items.map((x) => {
          const o = outcome[x.id]
          return (
            <button
              key={x.id}
              type="button"
              className="msg"
              aria-pressed={x.id === sel}
              style={x.id === sel ? { boxShadow: 'inset 0 0 0 1.5px var(--brand)' } : undefined}
              onClick={() => onSelect(x.id)}
            >
              <span className="av" style={{ '--c': x.noa ? 'var(--brand)' : '#7f9a99' } as CSSProperties}>{x.name[0]}</span>
              <span><b>{x.name}</b><small>{t('referrals.list.line', { to: x.to, from: x.from })}</small></span>
              <Pill tone={o ? (o === 'accepted' ? 'good' : 'warn') : x.noa ? 'brand' : 'plain'}>{o ? t(`referrals.list.${o}`) : x.tag}</Pill>
            </button>
          )
        })}
      </div>
      <p className="fine">{t('referrals.list.fine')}</p>
    </GlassCard>
  )
}

/** "Accept and book" / "Decline with a reason" (once), then the outcome note. */
function Decide({ outcome, onDecide }: { outcome: Outcome | undefined; onDecide: (o: Outcome) => void }) {
  const { t } = useTranslation('screening')
  const toast = useToast()
  const decide = (o: Outcome) => {
    toast(t(`referrals.detail.${o}Toast`))
    onDecide(o)
  }
  return outcome ? (
    <p className={`pill ${outcome === 'accepted' ? 'good' : 'warn'}`} style={{ justifySelf: 'start' }}>{t(`referrals.detail.${outcome}Note`)}</p>
  ) : (
    <div className="row">
      <button type="button" className="btn" onClick={() => decide('accepted')}>{t('referrals.detail.accept')}</button>
      <button type="button" className="btn soft" onClick={() => decide('declined')}>{t('referrals.detail.decline')}</button>
    </div>
  )
}

/** The selected referral (c7): who, why, what was understood, and "Accept and book" / "Decline with a reason" (once). */
function DetailCard({ r, fixed, outcome, onDecide }: { r: ReferralItem; fixed: ScreeningData['referrals']; outcome: Outcome | undefined; onDecide: (o: Outcome) => void }) {
  const { t } = useTranslation('screening')
  const rows: [string, string][] = [
    [t('referrals.detail.to'), r.to],
    [t('referrals.detail.from'), r.from],
    [t('referrals.detail.why'), r.why],
    [t('referrals.detail.understood'), fixed.understood],
    [t('referrals.detail.preferences'), r.pref],
    [t('referrals.detail.consent'), fixed.consent],
  ]
  return (
    <GlassCard span={7} id="refCard">
      <div className="ch"><h2>{r.name}</h2><span className="meta">{t('referrals.detail.meta')}</span></div>
      <div className="packet">
        {rows.map(([k, v]) => <div key={k}><span>{k}</span><b style={plain}>{v}</b></div>)}
      </div>
      <div className="kv2"><span>{t('referrals.detail.suggests')}</span><b style={plain}>{r.slot}</b></div>
      <Decide outcome={outcome} onDecide={onDecide} />
    </GlassCard>
  )
}

const REASONS: readonly RefReason[] = ['specialist', 'seen', 'tests', 'other']

/**
 * The decision on Noa's referral, stored in the family-health engine (it survives navigation and reaches the family):
 * "Accept and book", or "Decline with a reason" with a reason picker; then the stored decision with the doctor and the time.
 */
function NoaDecide({ r }: { r: FamilyReferral }) {
  const { t } = useTranslation('screening')
  const { x, raw } = useTexts()
  const toast = useToast()
  const [picking, setPicking] = useState(false)
  const [reason, setReason] = useState<RefReason | null>(null)
  const [note, setNote] = useState('')
  const name = raw(`people.${r.person}.name`)
  const d = r.decision
  if (d) {
    const text = d.outcome === 'accepted'
      ? t('referrals.noa.acceptedAt', { doctor: x(d.by), time: d.at, name })
      : t('referrals.noa.declinedAt', { doctor: x(d.by), time: d.at, reason: d.note ?? t(`referrals.noa.reason.${d.reason ?? 'other'}`) })
    return <p className={`pill ${d.outcome === 'accepted' ? 'good' : 'warn'}`} style={{ justifySelf: 'start' }} id="refDecision">{text}</p>
  }
  const accept = () => {
    if (getEngine().decideReferral(r.id, 'accepted')) toast(t('referrals.noa.acceptedToast', { name }))
  }
  const confirm = () => {
    if (!reason) return
    if (getEngine().decideReferral(r.id, 'declined', reason, reason === 'other' ? note : undefined)) toast(t('referrals.noa.declinedToast'))
  }
  if (picking) {
    return (
      <fieldset id="refReasons" style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        <legend style={{ fontWeight: 700, marginBottom: 6 }}>{t('referrals.noa.reasonTitle')}</legend>
        {REASONS.map((id) => (
          <label key={id} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
            <input type="radio" name="refReason" value={id} checked={reason === id} onChange={() => setReason(id)} />
            <span>{t(`referrals.noa.reason.${id}`)}</span>
          </label>
        ))}
        {reason === 'other' && (
          <input
            type="text"
            value={note}
            maxLength={200}
            autoFocus
            aria-label={t('referrals.noa.otherPlaceholder')}
            placeholder={t('referrals.noa.otherPlaceholder')}
            onChange={(ev) => setNote(ev.target.value)}
            style={{ border: 0, borderRadius: 12, padding: '9px 12px', font: 'inherit', color: 'inherit', background: 'var(--glass-2)', boxShadow: 'var(--glass-edge)' }}
          />
        )}
        <div className="row">
          <button type="button" className="btn" disabled={!reason || (reason === 'other' && !note.trim())} onClick={confirm}>{t('referrals.noa.confirm')}</button>
          <button type="button" className="btn soft" onClick={() => { setPicking(false); setReason(null); setNote('') }}>{t('referrals.noa.cancel')}</button>
        </div>
      </fieldset>
    )
  }
  return (
    <div className="row">
      <button type="button" className="btn" onClick={accept}>{t('referrals.detail.accept')}</button>
      <button type="button" className="btn soft" onClick={() => setPicking(true)}>{t('referrals.detail.decline')}</button>
    </div>
  )
}

type Level = Extract<PillTone, 'good' | 'warn' | 'bad' | 'plain'>
const TONE: Readonly<Record<string, Level>> = { good: 'good', warn: 'warn', bad: 'bad' }

/**
 * The referral Noa sent from a family-health journey: the standard rows, then what Noa booked, what the doctor decides,
 * the home test results (speech check, questionnaires, answers), Courier's note and the suggested slot.
 */
function NoaDetailCard({ r }: { r: FamilyReferral }) {
  const { t } = useTranslation('screening')
  const { x, raw } = useTexts()
  const rows: [string, string][] = [
    [t('referrals.detail.to'), x(r.to)],
    [t('referrals.detail.from'), x(r.from)],
    [t('referrals.detail.why'), x(r.why)],
    [t('referrals.detail.understood'), t(r.understood ? 'referrals.noa.understood' : 'referrals.noa.notUnderstood')],
    [t('referrals.detail.preferences'), x(r.preferences)],
    [t('referrals.detail.consent'), x(r.consent)],
  ]
  const urg = (u: string) => raw(`urgency.${u}`)
  return (
    <GlassCard span={7} id="refCard">
      <div className="ch"><h2>{x(r.title)}</h2><span className="meta">{t('referrals.noa.meta', { time: r.createdAt })}</span></div>
      <div className="packet">
        {rows.map(([k, v]) => <div key={k}><span>{k}</span><b style={plain}>{v}</b></div>)}
      </div>
      <Head title={t('referrals.noa.booked')} small />
      {r.booked.length ? (
        <ul className="check" id="refBooked">
          {r.booked.map((b, i) => (
            <li key={i}><span className="bx on">✓</span><span><b style={plain}>{x(b.name)}</b> · {x(b.where)} · {x(b.when)}</span><em>{urg(b.u)}</em></li>
          ))}
        </ul>
      ) : <p className="fine">{t('referrals.noa.bookedNone')}</p>}
      <Head title={t('referrals.noa.decide')} small />
      {r.forDoctor.length ? (
        <ul className="check" id="refDecide">
          {r.forDoctor.map((d, i) => (
            <li key={i}><span className="bx" /><span>{x(d.text)}</span><em>{urg(d.u)} · {x(d.due)}</em></li>
          ))}
        </ul>
      ) : <p className="fine">{t('referrals.noa.decideNone')}</p>}
      <Head title={t('referrals.noa.results')} small />
      {r.homeResults.length || r.answers.length ? (
        <ul className="check" id="refResults">
          {r.homeResults.map((h) => {
            const tone = TONE[h.lvl] ?? 'plain'
            return (
              <li key={h.id}><span className="bx on">✓</span><span><b style={plain}>{x(h.label)}</b>: {x(h.txt)}</span><Pill tone={tone}>{t(`referrals.noa.level.${tone}`)}</Pill></li>
            )
          })}
          {r.answers.map((a, i) => (
            <li key={`a${i}`}><span className="bx on">✓</span><span><b style={plain}>{x(a.label)}</b>: {x(a.value)}</span><em /></li>
          ))}
        </ul>
      ) : <p className="fine">{t('referrals.noa.resultsNone')}</p>}
      <Head title={t('referrals.noa.note')} small />
      <div className="kv2" id="refNote"><span>{t(`referrals.noa.source.${r.note.source}`)}</span><b style={plain}>{typeof r.note.text === 'string' ? r.note.text : x(r.note.text)}</b></div>
      <div className="kv2"><span>{t('referrals.detail.suggests')}</span><b style={plain}>{x(r.slot)}</b></div>
      <NoaDecide key={r.id} r={r} />
    </GlassCard>
  )
}

/** `?ref=<id>` from the family-health "Check referral as doctor" button (read once; the page needs no router hook). */
const refParam = (): string | null => {
  try { return typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('ref') } catch { return null }
}

/** Hospital view · Referrals (`<main data-page="referrals">`). Noa's referral from a family-health journey comes first. */
export function ReferralsPage() {
  const res = useScreening()
  const { t } = useTranslation('screening')
  const { x } = useTexts()
  const noa = useSnapshot().referral
  const [pick, setPick] = useState<string | null>(refParam)
  const [outcome, setOutcome] = useState<Readonly<Record<string, Outcome>>>({})
  if (res.status === 'error') return <PageError page="referrals" onRetry={res.retry} />
  const s = res.data
  if (!s) return <PageSkeleton page="referrals" />
  const demo = s.referrals.items
  const rows: Row[] = [
    ...(noa ? [{ id: noa.id, name: x(noa.title), to: x(noa.to), from: x(noa.from), tag: t('referrals.noa.tag'), noa: true }] : []),
    ...demo,
  ]
  const sel = rows.find((r) => r.id === pick) ?? rows[0]
  const r = demo.find((d) => d.id === sel.id)
  const onDecide = (o: Outcome) => setOutcome((m) => ({ ...m, [sel.id]: o }))
  // Noa's referral shows the decision stored in the engine; the demo rows keep theirs in this page.
  const shown = noa?.decision ? { ...outcome, [noa.id]: noa.decision.outcome } : outcome
  return (
    <main className="grid" data-page="referrals">
      <InboxCard items={rows} sel={sel.id} outcome={shown} onSelect={setPick} />
      {noa && sel.id === noa.id
        ? <NoaDetailCard r={noa} />
        : r && <DetailCard r={r} fixed={s.referrals} outcome={outcome[sel.id]} onDecide={onDecide} />}
    </main>
  )
}
