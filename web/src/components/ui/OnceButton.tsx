'use client'

import { useState, type ReactNode } from 'react'
import { useToast } from './Toast'

interface Props {
  /** Toast shown on the click (prototype `data-toast`). */
  toast?: string
  /** Text of the disabled state after the first click, e.g. '✓ Approved' (prototype `ONCE` / `data-done`). */
  done: string
  /** Extra classes, e.g. 'soft sm'. */
  className?: string
  onClick?: () => void
  children: ReactNode
}

/**
 * A `.btn` that fires once: the prototype's `handleDone` swaps the label for
 * `done`, disables the button and adds `soft`.
 */
export function OnceButton({ toast: message, done, className, onClick, children }: Props) {
  const toast = useToast()
  const [clicked, setClicked] = useState(false)
  const cls = ['btn', className ?? '', clicked ? 'soft' : ''].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      className={cls}
      disabled={clicked}
      onClick={() => {
        if (message) toast(message)
        onClick?.()
        setClicked(true)
      }}
    >
      {clicked ? done : children}
    </button>
  )
}
