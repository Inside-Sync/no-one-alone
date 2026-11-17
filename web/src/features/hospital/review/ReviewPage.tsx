'use client'

import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@/app/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import type { ReviewItem, ScreeningData } from '@/data/types'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { Head } from '../../individual/home/parts'
import { useScreening } from '../loop/useScreening'

const plain = { fontWeight: 500 } as const

/** `Waiting for doctor review` (c4): the results to look at, one selectable row each. */
function ListCard({ items, sel, sent, onSelect }: { items: ReviewItem[]; sel: string; sent: ReadonlySet<string>; onSelect: (id: string) => void }) {
  const { t } = useTranslation('screening')
  const router = useRouter()
  return (
    <GlassCard span={4}>
      <Head title={t('review.list.title')} meta={t('review.list.meta', { n: items.length })} />
      <div className="inbox" id="revList">
        {items.map((x) => {
          const on = x.id === sel
          const isSent = sent.has(x.id)
          return (
            <button
              key={x.id}
              type="button"
              className={`msg${on ? ' new' : ''}`}
              aria-pressed={on}
              style={on ? { boxShadow: 'inset 0 0 0 1.5px var(--brand)' } : undefined}
              onClick={() => onSelect(x.id)}
            >
              <span className="av" style={{ '--c': x.color } as CSSProperties}>{x.name[0]}</span>
              <span><b>{t('review.nameAge', { name: x.name, age: x.age })}</b><small>{x.result}</small></span>
              <Pill tone={isSent ? 'good' : x.tone}>{isSent ? t('review.confirmed') : x.tag}</Pill>
            </button>
          )
        })}
      </div>
      <p className="fine">{t('review.list.fine')}</p>
      <button type="button" className="btn soft" onClick={() => router.push('/hospital/overview')}>{t('review.back')}</button>
    </GlassCard>
  )
}

/** The one-page pre-consult summary (c5) for the selected result, with "Confirm and send plan" (once). */
function SummaryCard({ s, item, sent, onSend }: { s: ScreeningData['review']; item: ReviewItem; sent: boolean; onSend: () => void }) {
  const { t } = useTranslation('screening')
  const toast = useToast()
  const full = item.id === s.summary.id
  return (
    <GlassCard span={5} id="revCard">
      <Head
        title={full ? t('review.summary.title') : t('review.summary.titleOther')}
        meta={full ? t('review.summary.metaFull', { name: item.name, age: item.age }) : item.name}
      />
      {full ? (
        <>
          <div className="packet">
            {s.summary.rows.map(([k, v]) => <div key={k}><span>{k}</span><b style={plain}>{v}</b></div>)}
          </div>
          <Head title={t('review.summary.suggests')} small />
          <ul className="check">
            {s.summary.suggests.map((x) => (
              <li key={x.text}><span className="bx on">✓</span><span>{x.text}</span><em>{x.note}</em></li>
            ))}
          </ul>
          {sent ? (
            <p className="pill good" style={{ justifySelf: 'start' }}>{s.summary.sent}</p>
          ) : (
            <div className="row">
              <button type="button" className="btn" id="revGo" onClick={() => { toast(t('review.summary.sentToast')); onSend() }}>{t('review.summary.confirm')}</button>
              <button type="button" className="btn soft" onClick={() => toast(t('review.summary.draftToast'))}>{t('review.summary.draft')}</button>
            </div>
          )}
        </>
      ) : (
        <p className="fine">{s.otherHint}</p>
      )}
    </GlassCard>
  )
}

/** `Why this is faster` (c3). */
function WhyCard() {
  const { t } = useTranslation('screening')
  const items = t('review.why.items', { returnObjects: true }) as string[]
  return (
    <GlassCard className="c3">
      <Head title={t('review.why.title')} />
      <ul className="why">
        {items.map((x) => <li key={x}><span className="ic"><Icon name="check" /></span><span>{x}</span></li>)}
      </ul>
    </GlassCard>
  )
}

/** Hospital view · Results to review (`<main data-page="review">`). */
export function ReviewPage() {
  const res = useScreening()
  const [pick, setPick] = useState<string | null>(null)
  const [sent, setSent] = useState<ReadonlySet<string>>(new Set())
  if (res.status === 'error') return <PageError page="review" onRetry={res.retry} />
  const s = res.data
  if (!s) return <PageSkeleton page="review" />
  const sel = pick ?? s.review.items[0].id
  const item = s.review.items.find((x) => x.id === sel) ?? s.review.items[0]
  return (
    <main className="grid" data-page="review">
      <ListCard items={s.review.items} sel={item.id} sent={sent} onSelect={setPick} />
      <SummaryCard s={s.review} item={item} sent={sent.has(item.id)} onSend={() => setSent((d) => new Set(d).add(item.id))} />
      <WhyCard />
    </main>
  )
}
