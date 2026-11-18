'use client'

import type { ReactNode } from 'react'
import { Glyph } from '@/components/ui/Icon'
import { CASES } from '../../../data/cases'
import { ENABLER, PV } from '../../../data/prevention'
import { clk, hm, tx, type PrevInputs, type PvId } from '../../../engine'
import type { ScreenProps, ScreenSet } from '../types'
import { Tile, tok, useP } from './parts'
import { langAttrs, useSpeakResolve } from '../langText'

type Tone = 'green' | 'amber' | 'red' | 'info'

/** Screen 1 of the prevention cases (prototype renderPhoneP): the person's phone. */
export function PhoneP({ engine, snap, r }: ScreenProps) {
  const t = useP()
  const S = snap.state
  const st = snap.step
  const I = S.inp as PrevInputs
  const pv = PV[CASES[S.ck].pv as PvId]
  const i = S.step
  const rl = useSpeakResolve(engine, snap)
  const teachAttrs = st.kind === 'teach' ? langAttrs(S.lang) : {}
  const box = (tone: Tone, title: ReactNode, text: string) => (
    <div className={`status st-${tone}`} {...teachAttrs}><b>{title}</b>{text}</div>
  )
  let stat: ReactNode = null
  let tiles: ReactNode = null
  if (i === 0) {
    if (S.dec) stat = S.dec.path ? box('amber', <><Glyph name="speech" /> {t('phone.noaVoice')}</>, tok(engine, r, 'voice')) : box('green', t('phone.passport'), S.dec.rule === 'P8' ? t('phone.savedP8') : t('phone.nothingToDo'))
    else if (S.phase === 'ask') stat = box('amber', <><Glyph name="speech" /> {t('phone.noaVoice')}</>, t('phone.hardToGo'))
    else stat = box('info', t('phone.passport'), t('phone.tapToSee', { item: tok(engine, r, 'item') }))
    tiles = (
      <>
        <Tile k={t('phone.tileDue')} v={S.due ? t('phone.tileOneItem') : '—'} cls={S.due ? 'amber' : ''} />
        <Tile k={t('phone.tileOverdue')} v={I.overdue} u={t('phone.weeks')} cls={I.overdue ? 'amber' : ''} />
        <Tile k={t('phone.tileReminders')} v={I.rem} u={t('phone.tileSent')} />
        <Tile k={t('phone.tileSupport')} v={S.barrier ? `${r(tx(ENABLER[S.barrier].name)).split(' ')[0]}…` : '—'} />
      </>
    )
  } else if (st.kind === 'teach') {
    const e = engine.curExplain()
    stat = box('amber', <><Glyph name="graduation-cap" /> {t('phone.noaCoach')}</>, e ? rl(e.explain) : '')
  } else if (st.kind === 'result') {
    stat = S.done[i]
      ? box(S.branch === 'refer' ? 'amber' : 'green', t('phone.result'), S.branch === 'refer' ? t('phone.resultRefer') : t('phone.resultOk'))
      : box('info', t('phone.results'), t('phone.reviewing'))
  } else if (st.kind === 'refer') stat = box('info', t('phone.nextAppt'), S.branch === 'refer' ? r(tx(pv.refer)) : t('phone.nothingExtra'))
  else if (st.kind === 'report') stat = box('green', t('phone.passport'), t('phone.allBooked'))
  else if (st.phone) stat = box(st.phone.tone, r(tx(st.phone.title)), st.phone.text ? r(tx(st.phone.text)) : '')
  return (
    <>
      <div className="ph-notch" />
      <div className="ph-bar"><span>{hm(S.clock)}</span><span>{t('phone.network')}</span></div>
      <div className="ph-body">
        <div className="ph-hello"><h3>{t('phone.hello', { n: tok(engine, r, 'addr') })}</h3><span className="is-tag mtag-ind">{t('phone.tag')}</span></div>
        {stat}
        {tiles && <div className="tiles">{tiles}</div>}
        <div className="pend"><span>{clk(S.clock)}</span><span>{t('phone.passport')}</span></div>
      </div>
    </>
  )
}

/** Screen 2 of the prevention cases (prototype renderWebP): the family's Family Health Passport on the web. */
export function WebP({ engine, snap, r }: ScreenProps) {
  const t = useP()
  const S = snap.state
  const I = S.inp as PrevInputs
  const pv = PV[CASES[S.ck].pv as PvId]
  const child = pv.kind === 'child'
  const n = tok(engine, r, 'n')
  const fd = S.feed.slice().reverse().slice(0, 4)
  const booked = !!S.path && !!S.done[1]
  const rows = [
    {
      name: t(child ? 'passport.selfChild' : 'passport.selfAdult', { n, age: I.age }),
      what: S.due ? r(S.due.item) : t('web.checking'),
      state: booked ? t('web.bookedTick') : I.overdue ? t('web.overdue', { n: I.overdue }) : t('web.due'),
      cls: booked ? 'ok' : 'due',
    },
    ...pv.family.map((f) => ({ name: r(tx(f.name)), what: r(tx(f.what)), state: r(tx(f.state)), cls: f.cls })),
  ]
  return (
    <>
      <div className="win-bar mode-ind"><i /><i /><i /><span className="t">{t('web.title')} · <span className="mt">{t('web.mode')}</span> · {t('web.screen')}</span></div>
      <div className="win-body">
        <div className="pass">
          <span className="lab">{t('web.careGaps')}</span>
          {rows.map((row, k) => <div key={k} className={`prow ${row.cls}`}><b>{row.name}</b><span>{row.what}</span><em>{row.state}</em></div>)}
        </div>
        <div>
          <div className="lab" style={{ marginBlockEnd: 6 }}>{t('web.updates')}</div>
          <div className="explain">
            {fd.length
              ? fd.map((f, k) => <div key={k} className="fnd"><div className="h">{r(f.who)}</div><div>{r(f.text)}</div><div className="meta">{f.t}</div></div>)
              : <div className="empty">{t('web.noUpdates')}</div>}
          </div>
        </div>
      </div>
    </>
  )
}

/** Phone (screen 1) and the family's web window (screen 2) for the four prevention cases. The Noa panel is the app's. */
export const preventionScreens: ScreenSet = { Phone: PhoneP, Web: WebP }
