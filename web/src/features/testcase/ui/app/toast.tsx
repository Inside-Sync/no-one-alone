'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export const TOAST_MS = 2500

const ToastContext = createContext<(message: string) => void>(() => {})
/** `notify(text)` shows the overlay's one toast (a second message replaces the first, it never stacks). */
export const useToast = () => useContext(ToastContext)

/** A small polite status line inside the overlay (the page behind is inert, so a toast there would not be read). Hides itself after about 2.5 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [n, setN] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const notify = useCallback((m: string) => {
    if (timer.current) clearTimeout(timer.current)
    setMessage(m)
    setN((x) => x + 1)
    timer.current = setTimeout(() => { timer.current = undefined; setMessage('') }, TOAST_MS)
  }, [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="tc-toast-host" role="status" aria-live="polite" aria-atomic="true">
        {message && <div className="tc-toast" key={n}>{message}</div>}
      </div>
    </ToastContext.Provider>
  )
}
