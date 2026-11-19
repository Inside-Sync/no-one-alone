'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Glyph } from '@/components/ui/Icon'
import { AGENTS } from '../../../data/agents'
import { FAMILY_MEMBERS } from '../../../data/family'
import { pct, tx, type FamAlert } from '../../../engine'
import type { ScreenProps } from '../types'
import { Moment } from '../prevention/moment'
import { useP } from '../prevention/parts'

/** "Noa Forecast: heart risk 20% now → 26% in 5 years if trends continue" on a member's own open alert (prototype fcLine), only above low risk. */
function HeartLine({ snap, who }: { snap: ScreenProps['snap']; who: string }) {
  const t = useP()
  const f = snap.family?.forecast[who]
  if (!f || !f.ok || f.cat.id === 'low') return null
  return <span className="fcl"><Glyph name="trend" />{t(f.lab ? 'fam.dash.fcLine' : 'fam.dash.fcLineEst', { now: pct(f.r), r5: pct(f.r5) })}</span>
}

function AlertCard({ engine, snap, r, a }: ScreenProps & { a: FamAlert }) {
  const t = useP()
  const F = snap.state.fm!
  const tid = useId()
  const [momentOpen, setMomentOpen] = useState(false)
  // Briefly highlight the card whose state just changed (open -> done), so the person sees what their tap did.
  const last = useRef(a.state)
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (last.current === a.state) return
    last.current = a.state
    setFlash(true)
    const id = window.setTimeout(() => setFlash(false), 1400)
    return () => window.clearTimeout(id)
  }, [a.state])
  const m = FAMILY_MEMBERS.find((x) => x.id === a.who)!
  const ag = AGENTS[a.agent]
  return (
    <div className={`al ${a.lvl}${a.state === 'done' ? ' dn' : ''}${flash ? ' tc-flash' : ''}`} data-alert={a.id}>
      <div className="alh">
        <span><Glyph name={m.icon} /> <b>{r(tx(m.name))}</b></span>
        <span className="agt tcp-agt"><Glyph name={ag.icon} />{t('phone.noaAgent', { agent: r(tx(ag.n)) })}</span>
      </div>
      <b className="alt" id={tid}>{r(a.title)}</b>
      <span className="alw">{r(a.why)}</span>
      {a.state === 'open' && a.id === a.who && <HeartLine snap={snap} who={a.who} />}
      {a.state === 'open' ? (
        <div className="btnrow">
          {a.acts.map((x, i) => (
            <button key={x.id} type="button" className={`btn sm${i ? ' ghost' : ''}`} aria-describedby={tid} onClick={() => engine.famAct(x.id)}>{r(x.label)}</button>
          ))}
        </div>
      ) : (
        <span className="ald"><span className="ic" aria-hidden="true">✓</span> {a.done ? r(a.done) : t('fam.dash.done')}</span>
      )}
      {a.id === 'khalid' && (
        <>
          <button type="button" className="btn sm ghost tcp-toggle" aria-expanded={momentOpen} onClick={() => setMomentOpen((o) => !o)}>{t('moment.toggle')}</button>
          {momentOpen && (
            <Moment
              slot={r(tx('family.slots.khalid'))}
              booked={F.booked.khalid ? r(F.booked.khalid) : null}
              note={a.state === 'done' && !F.booked.khalid ? t('moment.withNoa.declined') : null}
              history={r(tx(FAMILY_MEMBERS.find((x) => x.id === 'khalid')!.fh))}
              onBook={() => engine.famAct('book_khalid')}
            />
          )}
        </>
      )}
    </div>
  )
}

/** Noa's alerts, open ones first: book, accept, keep the date, not now, and the heart-risk alerts (book the doctor review / not now). */
export function FamilyAlerts(p: ScreenProps) {
  const t = useP()
  const F = p.snap.state.fm
  if (!F) return null
  const open = F.alerts.filter((a) => a.state === 'open')
  const done = F.alerts.filter((a) => a.state === 'done')
  return (
    <>
      <span className="lab" aria-live="polite">{t('fam.dash.alerts', { n: open.length })}</span>
      <p className="note">{t('fam.dash.notNow')}</p>
      <div className="alerts">{open.concat(done).map((a) => <AlertCard key={a.id} {...p} a={a} />)}</div>
    </>
  )
}
