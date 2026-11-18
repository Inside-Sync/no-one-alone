'use client'

import type { ReactNode } from 'react'
import { Glyph } from '@/components/ui/Icon'
import { AGENTS } from '../../../data/agents'
import { FAMILY_MEMBERS } from '../../../data/family'
import { clk, hm, pct, tx } from '../../../engine'
import { langAttrs, useSpeakResolve } from '../langText'
import type { ScreenProps, ScreenSet } from '../types'
import { Tile, useP } from '../prevention/parts'
import { haText } from './Forecast'
import { FAM_STATUS_TONE } from './tones'

/** Screen 1 of the family case (prototype renderPhoneF): the phone of the person selected in the family tree, each reached their own way. */
export function PhoneF({ engine, snap, r }: ScreenProps) {
  const t = useP()
  const rl = useSpeakResolve(engine, snap)
  const S = snap.state
  const F = S.fm
  const fam = snap.family
  if (!F || !fam) return null
  const st = snap.step
  const m = FAMILY_MEMBERS.find((x) => x.id === F.sel)!
  const a = F.alerts.find((x) => x.who === m.id && x.state === 'open') ?? F.alerts.find((x) => x.who === m.id)
  const tone = FAM_STATUS_TONE[F.status[m.id]] ?? 'bad'
  const f = fam.forecast[m.id]
  const box = (cls: string, title: ReactNode, text: string, speak = false) => (
    <div className={`status st-${cls}`} {...(speak ? langAttrs(S.lang) : {})}><b>{title}</b>{text}</div>
  )
  let stat: ReactNode
  if (st.kind === 'teach' && F.sel === 'khalid') {
    const e = engine.curExplain()
    stat = box('amber', <><Glyph name="graduation-cap" /> {t('phone.noaCoach')}</>, e ? rl(e.explain) : '', true)
  } else if (a) {
    const ag = AGENTS[a.agent]
    stat = box(a.state === 'open' ? (a.lvl === 'red' ? 'red' : 'amber') : 'green', <><Glyph name={ag.icon} /> {t('phone.noaAgent', { agent: r(tx(ag.n)) })}</>, a.state === 'open' ? r(a.title) : r(a.done ?? a.title))
  } else stat = box('green', t('fam.phone.noa'), t('fam.phone.upToDate'))
  const name = r(tx(m.name))
  const pers = (): string => {
    switch (m.id) {
      case 'khalid': return f.ok ? t('fam.pers.khalidFc', { ha: haText(f.ha, r), r5: pct(f.r5), p5: pct(f.p5) }) : t('fam.pers.khalid')
      case 'hind': return t('fam.pers.hind', { n: fam.child.hind?.done ?? 0 })
      case 'moza': return t('fam.pers.moza')
      case 'saeed': return t('fam.pers.saeed')
      case 'amna': return t('fam.pers.amna')
      case 'maitha': return t('fam.pers.maitha')
      case 'sultan': return t('fam.pers.sultan')
      default: return t('fam.pers.hamdan')
    }
  }
  return (
    <>
      <div className="ph-notch" />
      <div className="ph-bar"><span>{hm(S.clock)}</span><span>{t('phone.network')}</span></div>
      <div className="ph-body">
        <div className="ph-hello"><h3>{m.stage === 'child' ? t('fam.phone.child', { n: name }) : t('fam.phone.hello', { n: name })}</h3><span className="is-tag mtag-ind">{t('phone.tag')}</span></div>
        {stat}
        <div className="toast"><Glyph name={m.icon} /> <span>{pers()}</span></div>
        <div className="tiles">
          <Tile k={t('fam.phone.tileFamily')} v={<span className="tcp-tile-s">{snap.famScore}%</span>} />
          <Tile k={t('fam.phone.tileMe')} v={r(tx(`family.status.${F.status[m.id]}`))} cls={tone === 'bad' ? 'red' : tone === 'warn' ? 'amber' : ''} />
          {f.ok
            ? <Tile k={t('fam.phone.tileHeart')} v={pct(f.r)} u={t('fam.phone.tileHeartUnit')} cls={f.cat.id === 'high' ? 'red' : f.cat.id === 'mid' ? 'amber' : ''} />
            : <Tile k={t('fam.phone.tileBadges')} v={F.badges.length} />}
          <Tile k={t('fam.phone.tileReached')} v={<span className="tcp-tile-xs">{r(tx(m.how)).split(';')[0]}</span>} />
        </div>
        <div className="pend"><span>{clk(S.clock)}</span><span>{t('phone.familyPassport')}</span></div>
      </div>
    </>
  )
}

/** Screen 2 of the family case (prototype renderWebF): the whole family's passport on the web, with the heart risk, and the family updates. */
export function WebF({ snap, r }: ScreenProps) {
  const t = useP()
  const S = snap.state
  const F = S.fm
  const fam = snap.family
  if (!F || !fam) return null
  const fd = S.feed.slice().reverse().slice(0, 5)
  return (
    <>
      <div className="win-bar mode-ind"><i /><i /><i /><span className="t">{t('web.title')} · <span className="mt">{t('web.mode')}</span> · {t('web.screen')}</span></div>
      <div className="win-body">
        <div className="pass">
          <span className="lab">{t('web.careGapsHeart')}</span>
          {FAMILY_MEMBERS.map((m) => {
            const tone = FAM_STATUS_TONE[F.status[m.id]] ?? 'bad'
            const a = F.alerts.find((x) => x.who === m.id && x.state === 'open') ?? F.alerts.find((x) => x.who === m.id)
            const f = fam.forecast[m.id]
            return (
              <div key={m.id} className={`prow ${tone === 'good' || tone === 'info' ? 'ok' : tone === 'muted' ? 'na' : 'due'}`}>
                <b><Glyph name={m.icon} /> {t('fam.tree.nameAge', { n: r(tx(m.name)), age: r(fam.age[m.id]) })}</b>
                <span>{F.booked[m.id] ? r(F.booked[m.id]) : a ? r(a.title) : '—'}{f.ok ? ` · ${t('fam.web.heart', { pct: pct(f.r) })}` : ''}</span>
                <em>{r(tx(`family.status.${F.status[m.id]}`))}</em>
              </div>
            )
          })}
        </div>
        <div>
          <div className="lab tcp-lab-gap">{t('web.updates')}</div>
          <div className="explain">
            {fd.length
              ? fd.map((f, k) => <div key={k} className="fnd"><div className="h">{r(f.who)}</div><div>{r(f.text)}</div><div className="meta">{f.t}</div></div>)
              : <div className="empty">{t('web.noUpdatesFam')}</div>}
          </div>
        </div>
      </div>
    </>
  )
}

/** Phone (screen 1) and the family's web window (screen 2) for the family case. */
export const familyScreens: ScreenSet = { Phone: PhoneF, Web: WebF }
