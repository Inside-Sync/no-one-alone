import { useEffect, useRef, useState } from 'react'
import { PEOPLE, STAGE_IDS, type NoaLang, type Snapshot } from '../index'
import { claimAutoRun, getEngine, getUi, reducedMotion, useSnapshot, useTexts } from './store'
import { E, WithNext, c } from './bits'
import { Now, STAGE_MODE, syncTick } from './Feed'
import { Orchestra } from './Orchestra'
import { QuickTests, runCase } from './QuickTests'
import { Drawer, closeDrawer } from './Drawer'
import { PanelContext, type PanelCtx } from './panelContext'
import { canDictate, listen, speak, type Listening } from './speechIo'
import { Tree } from './Tree'

const AUTO_RUN_MS = 300
const SYNC_MS = 3000

/** "Noa · family health": the whole Family health tab (prototype `section.jp` and its drawer). */
export function FamilyHealthPanel() {
  const snap = useSnapshot()
  const e = getEngine()
  const { u, x, raw, lang: appLang } = useTexts()

  // When the app's language changes, Noa speaks it too (so an Arabic page never asks for the English sentence); the panel's own
  // EN / AR switch can still change it afterwards.
  useEffect(() => { getEngine().setLang(appLang === 'ar' ? 'ar' : 'en') }, [appLang])

  // Decision (c): auto-run Saeed's test case 300 ms after the tab first opens in this page load.
  useEffect(() => {
    const tm = setTimeout(() => { if (claimAutoRun() && !getEngine().getSnapshot().journey) runCase('s0', true) }, AUTO_RUN_MS)
    return () => clearTimeout(tm)
  }, [])

  // Emergency night palette: EmergencyNight (mounted by the shell, so it holds on every view).

  // Live wearables: a reading every 3 s (simulated), drifting toward today's heart rate.
  const [, setTick] = useState(0)
  const snapRef = useRef(snap)
  useEffect(() => { snapRef.current = snap })
  useEffect(() => {
    const iv = setInterval(() => {
      const s = snapRef.current, j = s.journey
      if (!j || PEOPLE[j.person].child) return
      const p = s.profiles[j.person]
      if (p.child) return
      const wake = !!j.urgent && j.urgent.startsWith('G'), us = PEOPLE[j.person].usual ?? [62, 72]
      syncTick(wake ? p.hr : Math.round((us[0] + us[1]) / 2), wake && p.irr)
      setTick((n) => n + 1)
    }, SYNC_MS)
    return () => clearInterval(iv)
  }, [])

  // Microphone and speech out.
  const [listening, setListening] = useState<'speech' | 'comp' | null>(null)
  const [liveText, setLiveText] = useState('')
  const [micMsg, setMicMsg] = useState('')
  const [draft, setDraft] = useState('')
  const rec = useRef<Listening | null>(null)
  const askRef = useRef<HTMLInputElement>(null)
  const startListen = (target: 'speech' | 'comp') => {
    setMicMsg('')
    setLiveText('')
    const lang = getEngine().getSnapshot().lang
    rec.current = listen(lang, (t) => { if (target === 'speech') setLiveText(t); else setDraft(t) }, (r) => {
      rec.current = null
      setListening(null)
      if (r.error && !r.text) { setMicMsg(u(r.error === 'not_granted' ? 'spx.micOff' : 'spx.micFail')); return }
      if (target === 'speech') {
        if (!r.text) { setMicMsg(u('spx.noWords')); return }
        getEngine().submitSpeech(r.text, r.secs, 'spoken')
      } else { setDraft(r.text); askRef.current?.focus() }
    })
    if (rec.current) setListening(target)
    else setMicMsg(u('spx.micFail'))
  }
  const stopListen = () => { rec.current?.stop() }
  const ctx: PanelCtx = { listening, liveText, micMsg, startListen, stopListen, say: (t: string, l: NoaLang) => speak(t, l) }

  // Keyboard: → runs Next (not while typing), Esc closes the record drawer.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && getUi().drawer) { closeDrawer(); return }
      const tg = ev.target as HTMLElement | null
      if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) && (tg as HTMLInputElement).type !== 'range') return
      if (tg?.isContentEditable) return
      if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return
      if (ev.key === 'ArrowRight' && getEngine().getSnapshot().pending && (tg as HTMLInputElement | null)?.type !== 'range') { ev.preventDefault(); getEngine().next() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // A new "Your turn" card comes into view only while the viewer has not been working in the panel (prototype: only when focus is on
  // <body>; a click inside its shadow host keeps focus there, so after a click it never scrolls). Instant, nearest, never smooth, so
  // answering a card does not move the page. A click outside the panel lets it follow again.
  const touched = useRef(false)
  useEffect(() => {
    const onDown = (ev: PointerEvent) => {
      const panel = document.getElementById('fh-panel')
      const t = ev.target instanceof Element ? ev.target : null
      const inside = !!panel && !!t && panel.contains(t)
      // A click on another control (the theme button, a tab…) keeps focus there, so like the prototype the card does not jump either.
      if (inside || t?.closest('button,a,input,select,textarea,[role="button"]')) { touched.current = true; return }
      touched.current = false
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [])
  const pendingId = snap.pending?.id
  useEffect(() => {
    if (pendingId == null || touched.current || reducedMotion()) return
    const a = document.activeElement
    if (a && a !== document.body) return
    document.querySelector(`[data-card="${pendingId}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [pendingId])

  const j = snap.journey
  const send = () => { const t = draft.trim(); if (!t) return; setDraft(''); void e.reply(t) }
  const pend = snap.pending
  const nm = j ? raw(`people.${j.person}.name`) : ''
  const ph = pend
    ? (pend.type === 'speech' ? u('comp.speech', { name: nm }) : pend.type === 'choice' && pend.free ? u('comp.free', { who: x(pend.who) }) : u('comp.ask'))
    : j && !j.done ? u('comp.working') : u('comp.ask')
  const dict = canDictate()
  return (
    <PanelContext.Provider value={ctx}>
      <div className={c('host nl')} id="fh-panel">
        <section className={c('jp', snap.emergency && 'em')} aria-labelledby="fh-title">
          <div className={c('jph')}>
            <div className={c('t')}><h2 id="fh-title">{u('header.title')}</h2><span><WithNext text={u('header.sub')} /></span></div>
            <div className={c('ctl')}>
              <span className={c('seg')} role="group" aria-label={u('header.speaks')}>
                {(['en', 'ar'] as const).map((l) => (
                  <button type="button" key={l} lang={l} aria-pressed={snap.lang === l} onClick={() => e.setLang(l)}>{u(`header.${l}`)}</button>
                ))}
              </span>
              <button type="button" className={c('chip ai', snap.ai === 'live' ? 'on' : 'off')} aria-label={u('header.aiLabel')} aria-pressed={snap.ai === 'live'}
                disabled={snap.ai === 'none'} onClick={() => e.setAiEnabled(snap.ai !== 'live')}>
                <i className={c('dot', snap.ai === 'live' && snap.thinking && 'pulse')} />
                {u(snap.ai === 'none' ? 'header.ai.none' : snap.ai === 'off' ? 'header.ai.off' : snap.thinking ? 'header.ai.thinking' : 'header.ai.live')}
              </button>
              <button type="button" className={c('chip')} onClick={() => { closeDrawer(); e.reset() }}>{u('header.reset')}</button>
            </div>
          </div>
          <Tree snap={snap} />
          <ol className={c('steps')} aria-label={u('steps.label')}>
            {STAGE_IDS.map((k) => {
              const cur = j?.stage === k && !j.done, seen = j?.seen.includes(k)
              return <li key={k} className={c('st', STAGE_MODE[k], cur ? 'cur' : seen ? 'done' : '')} aria-current={cur ? 'step' : undefined}><span>{raw(`stages.${k}.name`)}</span></li>
            })}
          </ol>
          <StageNote snap={snap} />
          <div className={c('body')} id="fh-body">
            <div>
              <Now snap={snap} />
              <div className={c('comp')}>
                <input id="fh-ask" ref={askRef} value={draft} placeholder={ph} aria-label={u('comp.aria')} autoComplete="off"
                  onChange={(ev) => setDraft(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); send() } }} />
                {dict && (listening === 'comp'
                  ? <button type="button" className={c('btn rec sm gStopOnly')} aria-label={u('spx.stop')} onClick={stopListen} />
                  : <button type="button" className={c('btn ghost sm')} aria-label={u('comp.speak')} onClick={() => startListen('comp')}><E n="mic-studio" /></button>)}
                <button type="button" className={c('btn ghost sm')} onClick={send}>{u('comp.send')}</button>
                <button type="button" className={c('btn next gNext')} disabled={!pend} title={u('comp.nextTitle')} aria-keyshortcuts="ArrowRight" onClick={() => e.next()}>{u('comp.next')}</button>
              </div>
            </div>
            <Orchestra snap={snap} />
          </div>
          <QuickTests />
        </section>
      </div>
      <Drawer snap={snap} />
    </PanelContext.Provider>
  )
}


function StageNote({ snap }: { snap: Snapshot }) {
  const { u, raw } = useTexts()
  const j = snap.journey
  if (!j || !j.stage) return <div className={c('tnote')} hidden aria-live="polite" />
  const k = j.stage, mode = STAGE_MODE[k], name = raw(`people.${j.person}.name`)
  const title = raw(`stages.${k}.title`)
  return (
    <div className={c('tnote', mode)} aria-live="polite" key={`${k}-${!!j.done}`}>
      <span className={c('mtag')}>{u('mode', { mode: raw(`modes.${mode}`) })}</span>
      <div>
        <b>{j.done ? u('note.done', { title }) : title}</b>
        <p>{raw(`stages.${k}.body`, { name })}</p>
        {!j.done && <p className={c('you')}><E n="point-right" /> {raw(`stages.${k}.you`, { name })}</p>}
      </div>
    </div>
  )
}
