'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from '@/app/navigation'
import { WhoSwitch } from './WhoSwitch'
import * as repo from '@/data/repo'
import { STEPS } from '@/domain/emergency'
import { CATEGORY_IDS, countSees } from '@/domain/consent'
import type { ContextBar as Ctx } from '@/data/types'
import { OWN_CONTEXT, PAGE_TITLES, parsePath, VIEW_LABELS } from '@/domain/views'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import s from './shell.module.css'

type Bars = { person: Ctx; lineage: Ctx; hospital: Ctx; community: Ctx }

function useContextBars(): Bars | null {
  const [bars, setBars] = useState<Bars | null>(null)
  useEffect(() => {
    let live = true
    Promise.all([
      repo.getPerson('margaret'), repo.getLineage('margaret'), repo.getHospital(), repo.getCommunity(),
    ]).then(([p, l, h, c]) => {
      if (live) setBars({ person: p.context, lineage: l.context, hospital: h.context, community: c.context })
    }, () => {})
    return () => { live = false }
  }, [])
  return bars
}

export function ContextBar() {
  const router = useRouter()
  const { view, page } = parsePath(usePathname())
  const { who, setWho, setViewer, viewer, paused, share, people, emergency } = useAppState()
  const { view: liveView, people: livePeople } = useLiveIncident()
  const bars = useContextBars()

  let ctx: Ctx | undefined
  if (page === 'me' || page === 'privacy') ctx = { ...OWN_CONTEXT[page], facts: [...OWN_CONTEXT[page].facts] }
  else if (view === 'hospital') ctx = bars?.hospital
  else if (view === 'community') ctx = bars?.community
  else ctx = page === 'lineage' ? bars?.lineage : bars?.person

  const individual = view === 'individual'
  const self = who === 'self'
  const viewerInfo = people.find((p) => p.id === viewer)
  const viewerName = viewerInfo?.name ?? ''
  const sees = share ? countSees(share, paused, viewer) : 0

  const banner = !individual
    ? VIEW_LABELS[view]
    : self
      ? "Margaret's own view · she controls her information"
      : `Family & carers view · ${viewerName} sees only what Margaret shares`

  const switchWho = (w: typeof who) => {
    setWho(w)
    if (w === 'family') setViewer('james')
    router.push(w === 'self' ? '/individual/me' : '/individual/home')
  }

  return (
    <>
      <section className="ctx glass" aria-live="polite">
        <span
          className="av"
          id="ctxAv"
          style={{ '--c': ctx?.color ?? '#0b7f71', width: 46, height: 46, fontSize: 15 } as React.CSSProperties}
        >
          {ctx?.initials}
        </span>
        <div>
          <span className="vbanner" id="vban">{banner}</span>
          <h1 id="pgTitle">{page ? PAGE_TITLES[page] : ''}</h1>
          <div className="sub" id="pgSub">{page === 'live' && liveView?.open ? repo.LIVE_COPY.liveSubtitle(liveView.storyTime, livePeople.person?.addressText) : page === 'live' && emergency.active ? repo.LIVE_COPY.subtitle(STEPS[emergency.step].t) : ctx?.sub}</div>
        </div>
        <span className="sp"></span>
        {individual && <WhoSwitch who={who} onSelect={switchWho} />}
        <div className="facts" id="facts">
          {individual && !self && share && (
            <span className="fact"><i></i>{viewerName} sees <b>{sees} of {CATEGORY_IDS.length}</b> things Margaret shares</span>
          )}
          {ctx?.facts.map((f) => (
            <span className="fact" key={f.label}>{f.live && <i></i>}{f.label} <b>{f.value}</b></span>
          ))}
        </div>
      </section>
      {individual && !self && paused && (
        <div className={`glass ${s.pauseBanner}`} id="pauseBanner">
          ⏸️ <b>Margaret paused sharing until 9 am tomorrow.</b> You&apos;ll still get safety alerts straight away.
        </div>
      )}
    </>
  )
}
