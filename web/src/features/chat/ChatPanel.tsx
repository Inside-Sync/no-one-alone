import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { usePathname } from '@/app/navigation'
import { NoaOrb } from '@/components/noa/NoaOrb'
import type { ChatMode, ChatTurn } from '@/data/api'
import { parsePath } from '@/domain/views'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import './chat.css'

const HISTORY = 10
const CALLS_HER_MUM = new Set(['james', 'sarah'])

interface Log { key: string; msgs: ChatTurn[]; waiting: boolean }

/** "Ask Noa" button and the chat panel (UI spec 1.1 to 1.7); answers come from `POST /api/chat`. */
export function ChatPanel() {
  const { t } = useTranslation('chat')
  const { view } = parsePath(usePathname())
  const { who, viewer, people } = useAppState()
  const { live, incident } = useLiveIncident()
  const mode: ChatMode = view === 'hospital' ? 'hosp' : view === 'individual' && who === 'self' ? 'self' : 'fam'
  const key = mode === 'fam' ? `fam:${viewer}` : mode
  const name = people.find((p) => p.id === viewer)?.name ?? ''

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [log, setLog] = useState<Log>({ key, msgs: [], waiting: false })
  // A new mode or viewer starts a new conversation with its own greeting.
  const cur = log.key === key ? log : { key, msgs: [], waiting: false }
  const input = useRef<HTMLInputElement>(null)
  const fab = useRef<HTMLButtonElement>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      fab.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }) }, [cur.msgs.length, cur.waiting])

  function close() {
    setOpen(false)
    fab.current?.focus()
  }

  async function ask(q: string) {
    const question = q.trim()
    if (!question || cur.waiting) return
    const history = cur.msgs.slice(-HISTORY)
    setLog({ key, msgs: [...cur.msgs, { by: 'me', text: question }], waiting: true })
    let answer = t('offline')
    if (live) {
      try {
        answer = (await (await import('@/data/api')).chat({ question, mode, viewer: mode === 'fam' ? viewer : undefined, history })).answer
      } catch {
        answer = t('failed')
      }
    }
    setLog((l) => (l.key === key ? { key, msgs: [...l.msgs, { by: 'noa', text: answer }], waiting: false } : l))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void ask(text)
    setText('')
  }

  const chips = [...t(`chips.${mode}`, { returnObjects: true, who: CALLS_HER_MUM.has(viewer) ? t('mum') : t('she') }) as string[]]
  if (mode === 'fam' && incident?.recovery) chips.splice(3, 0, t('recoveryChip'))

  const cav = <span className="cav"><NoaOrb size={22} /><b>{t('name')}</b></span>

  return (
    <>
      <aside className={open ? 'chat on' : 'chat'} aria-label={t('label')}>
        <header>
          <span className="chat-orb"><NoaOrb size={40} talk={cur.waiting} /></span>
          <div><b>{t('name')}</b><small>{mode === 'fam' ? t('sub.fam', { name }) : t(`sub.${mode}`)}</small></div>
          <button type="button" className="rb" aria-label={t('close')} onClick={close}>✕</button>
        </header>
        <div className="chat-msgs" aria-live="polite">
          {cav}
          <div className="cm">
            {mode === 'hosp' ? <Trans t={t} i18nKey="greet.hosp" components={{ b: <b /> }} /> : t(`greet.${mode}`, { name })}
          </div>
          {cur.msgs.map((m, i) => (
            <div key={i} className="chat-turn">
              {m.by === 'noa' && cav}
              <div className={m.by === 'me' ? 'cm me' : 'cm'}>{m.text}</div>
            </div>
          ))}
          {cur.waiting && <div className="cm typing" role="status" aria-label={t('typing')}><i /><i /><i /></div>}
          <div ref={end} />
        </div>
        <div className="chat-chips">
          {chips.map((c) => <button key={c} type="button" className="chip" onClick={() => void ask(c)}>{c}</button>)}
        </div>
        <form className="chat-f" autoComplete="off" onSubmit={submit}>
          <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('placeholder')} aria-label={t('input')} maxLength={500} />
          <button className="btn sm" type="submit">{t('send')}</button>
        </form>
      </aside>
      <button ref={fab} type="button" className={open ? 'chat-fab hide' : 'chat-fab'} aria-expanded={open} aria-label={t('fab')} onClick={() => setOpen(true)}>
        <NoaOrb size={32} /><span>{t('fab')}</span><i className="live" />
      </button>
    </>
  )
}
