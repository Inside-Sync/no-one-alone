import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PEOPLE, type Note, type PersonId } from '../index'
import { getEngine, setUi, useSnapshot, useTexts, useUi } from './store'
import { E, c } from './bits'
import { AgentOrb } from '@/components/noa/AgentOrb'

const TOAST_MS = 4500

/**
 * The Individual view's messages button (prototype `#fab`), its toast and the "Noa · family messages" panel with Ask Noa
 * (prepared answers until the AI team wires the chat). Mounted by the shell on every Individual tab.
 */
export function FamilyMessages() {
  const snap = useSnapshot()
  const { chat, toast } = useUi()
  const { u, x, raw } = useTexts()
  const e = getEngine()
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const fab = useRef<HTMLButtonElement>(null)

  // A new note while the panel is closed shows in the toast for 4.5 s (the seeded ones too, as the prototype's start does).
  const seen = useRef<number | null>(null)
  const top = snap.notes[0]
  useEffect(() => {
    if (!top || top.id === seen.current) return
    const first = seen.current === null
    seen.current = top.id
    if (chat) { e.markNotesRead(); return }
    if (top.to === 'noa' || top.to === 'me' || (first && top.read)) return
    setUi({ toast: top.id })
  }, [top, chat, e])
  useEffect(() => {
    if (toast == null) return
    const tm = setTimeout(() => setUi({ toast: null }), TOAST_MS)
    return () => clearTimeout(tm)
  }, [toast])

  const open = (on: boolean) => {
    setUi({ chat: on, toast: null })
    if (on) { e.markNotesRead(); setTimeout(() => input.current?.focus(), 0) } else fab.current?.focus()
  }
  useEffect(() => {
    if (!chat) return
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { setUi({ chat: false }); fab.current?.focus() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [chat])

  const ask = () => { const q = text.trim(); if (!q) return; setText(''); void e.askNoa(q) }
  const who = (n: Note) => (n.to === 'noa' || n.to === 'me' ? u('chat.you') : raw(`people.${n.to}.name`))
  const toastNote = toast != null ? snap.notes.find((n) => n.id === toast) : null
  const shownToast = toastNote ?? null
  const unread = snap.unread
  return createPortal(
    <div className={c('host')}>
      <button type="button" id="fh-toast" className={c('chtoast', shownToast && 'on')} aria-label={u('chat.open')} aria-hidden={!shownToast} tabIndex={shownToast ? 0 : -1} onClick={() => open(true)}>
        {shownToast && <><b>{shownToast.to === 'noa' ? <span className={c('sysLg')} aria-hidden="true"><AgentOrb size={16} /></span> : <E n={shownToast.icon} />} {u('chat.toast', { name: who(shownToast) })}</b><span>{x(shownToast.text)}</span></>}
      </button>
      <button type="button" className={c('fab')} ref={fab} id="fh-fab" aria-expanded={chat} aria-controls="fh-chat"
        aria-label={unread ? u('chat.fabNew', { n: unread }) : u('chat.fab')} onClick={() => open(!chat)}>
        <span className={c('lg')} aria-hidden="true"><AgentOrb size={50} /></span>
        {unread > 0 && <span className={c('fb')} aria-hidden="true">{unread}</span>}
      </button>
      <section className={c('chatp', chat && 'open')} id="fh-chat" aria-hidden={!chat} inert={!chat} aria-label={u('chat.fab')}>
        <div className={c('chh')}>
          <span className={c('orb2')} aria-hidden="true"><AgentOrb size={44} /></span>
          <div><b>{u('chat.title')}</b><small>{u('chat.sub')}</small></div>
          <button type="button" className={c('x')} aria-label={u('chat.close')} onClick={() => open(false)}>✕</button>
        </div>
        <div className={c('chl')} tabIndex={0} role="log" aria-label={u('chat.title')}>
          {snap.notes.length ? snap.notes.map((n) => n.to === 'me'
            ? <div key={n.id} className={c('cm me')}><span>{x(n.text)}</span></div>
            : (
              <div key={n.id} className={c('cm', n.to === 'noa' && 'noa')}>
                <span className={c('ca', n.to === 'noa' && 'lgc')}>{n.to === 'noa' ? <AgentOrb size={34} /> : <E n={PEOPLE[n.to as PersonId].icon} />}</span>
                <div>
                  <small>{n.to === 'noa' ? u('chat.noa', { t: n.t }) : <><E n={n.icon} /> {u('chat.to', { name: who(n), t: n.t })}</>}{n.source === 'live' && <em className={c('src live')}>{u('agent.src.live')}</em>}</small>
                  <span>{x(n.text)}</span>
                </div>
              </div>
            )) : <p className={c('mut sm')}>{u('chat.empty')}</p>}
        </div>
        <div className={c('chf')}>
          <input ref={input} value={text} placeholder={u('chat.ph')} aria-label={u('chat.aria')} autoComplete="off"
            onChange={(ev) => setText(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ask() } }} />
          <button type="button" className={c('btn sm')} onClick={ask}>{u('chat.send')}</button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
