'use client'

import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import type { ReferralItem, ScreeningData } from '@/data/types'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useScreening } from '../loop/useScreening'

const plain = { fontWeight: 500 } as const

type Outcome = 'accepted' | 'declined'

/** `Referral inbox` (c5): the referrals from physicians, one selectable row each. */
function InboxCard({ items, sel, outcome, onSelect }: { items: ReferralItem[]; sel: string; outcome: Readonly<Record<string, Outcome>>; onSelect: (id: string) => void }) {
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
              <span className="av" style={{ '--c': '#7f9a99' } as CSSProperties}>{x.name[0]}</span>
              <span><b>{x.name}</b><small>{t('referrals.list.line', { to: x.to, from: x.from })}</small></span>
              <Pill tone={o ? (o === 'accepted' ? 'good' : 'warn') : 'plain'}>{o ? t(`referrals.list.${o}`) : x.tag}</Pill>
            </button>
          )
        })}
      </div>
      <p className="fine">{t('referrals.list.fine')}</p>
    </GlassCard>
  )
}

/** The selected referral (c7): who, why, what was understood, and "Accept and book" / "Decline with a reason" (once). */
function DetailCard({ r, fixed, outcome, onDecide }: { r: ReferralItem; fixed: ScreeningData['referrals']; outcome: Outcome | undefined; onDecide: (o: Outcome) => void }) {
  const { t } = useTranslation('screening')
  const toast = useToast()
  const rows: [string, string][] = [
    [t('referrals.detail.to'), r.to],
    [t('referrals.detail.from'), r.from],
    [t('referrals.detail.why'), r.why],
    [t('referrals.detail.understood'), fixed.understood],
    [t('referrals.detail.preferences'), r.pref],
    [t('referrals.detail.consent'), fixed.consent],
  ]
  const decide = (o: Outcome) => {
    toast(t(`referrals.detail.${o}Toast`))
    onDecide(o)
  }
  return (
    <GlassCard span={7} id="refCard">
      <div className="ch"><h2>{r.name}</h2><span className="meta">{t('referrals.detail.meta')}</span></div>
      <div className="packet">
        {rows.map(([k, v]) => <div key={k}><span>{k}</span><b style={plain}>{v}</b></div>)}
      </div>
      <div className="kv2"><span>{t('referrals.detail.suggests')}</span><b style={plain}>{r.slot}</b></div>
      {outcome ? (
        <p className={`pill ${outcome === 'accepted' ? 'good' : 'warn'}`} style={{ justifySelf: 'start' }}>{t(`referrals.detail.${outcome}Note`)}</p>
      ) : (
        <div className="row">
          <button type="button" className="btn" onClick={() => decide('accepted')}>{t('referrals.detail.accept')}</button>
          <button type="button" className="btn soft" onClick={() => decide('declined')}>{t('referrals.detail.decline')}</button>
        </div>
      )}
    </GlassCard>
  )
}

/** Hospital view · Referrals (`<main data-page="referrals">`). */
export function ReferralsPage() {
  const res = useScreening()
  const [pick, setPick] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Readonly<Record<string, Outcome>>>({})
  if (res.status === 'error') return <PageError page="referrals" onRetry={res.retry} />
  const s = res.data
  if (!s) return <PageSkeleton page="referrals" />
  const items = s.referrals.items
  const r = items.find((x) => x.id === pick) ?? items[0]
  return (
    <main className="grid" data-page="referrals">
      <InboxCard items={items} sel={r.id} outcome={outcome} onSelect={setPick} />
      <DetailCard r={r} fixed={s.referrals} outcome={outcome[r.id]} onDecide={(o) => setOutcome((m) => ({ ...m, [r.id]: o }))} />
    </main>
  )
}
