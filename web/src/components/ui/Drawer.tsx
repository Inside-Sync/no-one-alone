'use client'

import { createContext, Fragment, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

interface DrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children?: ReactNode
}

/**
 * Presentational modal drawer (prototype `#drawer` + `#scrim`).
 * Esc and scrim click close; Tab is trapped; focus returns to the opener on close.
 */
export function Drawer({ open, title, onClose, children }: DrawerProps) {
  const titleId = useId()
  const ref = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const focusTimer = setTimeout(() => closeRef.current?.focus(), 60)
    const background = document.querySelector<HTMLElement>('.wrap')
    background?.setAttribute('inert', '')

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const root = ref.current
      const items = Array.from(root?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      if (!root || items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const outside = !root.contains(active)
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      background?.removeAttribute('inert')
      opener?.focus()
    }
  }, [open])

  // Always mounted, like the prototype: only the `on` class toggles, so the slide-out plays.
  return (
    <>
      <div className={open ? 'scrim on' : 'scrim'} id="scrim" onClick={onClose} aria-hidden="true"></div>
      <aside
        ref={ref}
        className={open ? 'drawer on' : 'drawer'}
        id="drawer"
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="dr-h">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="close" id="drClose" aria-label="Close" ref={closeRef} onClick={onClose}>
            <span className="ic"><Icon name="x" /></span>
          </button>
        </div>
        <div id="drBody" style={{ display: 'grid', gap: 12 }}>{children}</div>
      </aside>
    </>
  )
}

interface DrawerApi {
  open: (title: string, body: ReactNode) => void
  /** Slides the drawer out; its body is dropped from the DOM once the slide-out has finished. */
  close: () => void
  /** Closes at once and drops the body now (consent, viewer or route changed: the body may no longer be allowed). */
  reset: () => void
}
const Ctx = createContext<DrawerApi | null>(null)

/** `.drawer` slides out over `transform .32s` (globals.css); the body is cleared just after that. */
export const DRAWER_SLIDE_MS = 340

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

interface HostState { title: string; body: ReactNode; open: boolean; seq: number }

/**
 * Single drawer host, like the prototype's one `#drawer`.
 * Review Focus 1: a closed drawer must not keep data in the DOM, so the body is cleared after the slide-out
 * (at once under reduced motion) and `reset()` clears it immediately.
 * Every open gets a fresh `seq` key, so the body's components start from clean state, like the prototype's
 * `innerHTML` rebuild (an "✓ Added" button never carries over to the next drawer).
 */
export function DrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HostState>({ title: '', body: null, open: false, seq: 0 })
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancelClear = useCallback(() => {
    clearTimeout(clearTimer.current)
    clearTimer.current = undefined
  }, [])
  const open = useCallback((title: string, body: ReactNode) => {
    cancelClear()
    setState((s) => ({ title, body, open: true, seq: s.seq + 1 }))
  }, [cancelClear])
  const reset = useCallback(() => {
    cancelClear()
    setState((s) => (s.open || s.body !== null || s.title ? { ...s, title: '', body: null, open: false } : s))
  }, [cancelClear])
  const close = useCallback(() => {
    if (reducedMotion()) { reset(); return }
    setState((s) => (s.open ? { ...s, open: false } : s))
    cancelClear()
    clearTimer.current = setTimeout(() => {
      clearTimer.current = undefined
      setState((s) => (s.open ? s : { ...s, title: '', body: null }))
    }, DRAWER_SLIDE_MS)
  }, [cancelClear, reset])
  useEffect(() => cancelClear, [cancelClear])
  const api = useMemo(() => ({ open, close, reset }), [open, close, reset])
  return (
    <Ctx.Provider value={api}>
      {children}
      <Drawer open={state.open} title={state.title} onClose={close}>
        <Fragment key={state.seq}>{state.body}</Fragment>
      </Drawer>
    </Ctx.Provider>
  )
}

export function useDrawer(): DrawerApi {
  const api = useContext(Ctx)
  if (!api) throw new Error('useDrawer must be used inside <DrawerProvider>')
  return api
}
