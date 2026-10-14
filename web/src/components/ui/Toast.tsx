'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

/** Prototype `toast()` hides after 2400ms (ruling R5). */
export const TOAST_MS = 2400

type ToastFn = (msg: string) => void
const Ctx = createContext<ToastFn | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('')
  const [on, setOn] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const toast = useCallback<ToastFn>((m) => {
    setMsg(m)
    setOn(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOn(false), TOAST_MS)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className={on ? 'toast on' : 'toast'} id="toast" role="status">{msg}</div>
    </Ctx.Provider>
  )
}

/** Returns `toast(msg)`; throws outside a `ToastProvider`. */
export function useToast(): ToastFn {
  const toast = useContext(Ctx)
  if (!toast) throw new Error('useToast must be used inside <ToastProvider>')
  return toast
}
