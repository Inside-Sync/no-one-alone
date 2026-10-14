'use client'

import { useToast } from '@/components/ui/Toast'
import { PRIVACY_COPY } from '@/data/repo'
import { useAppState } from '@/state/AppState'

/** The pause / resume button (prototype `#pauseBtn`, `#pauseBtn2`). AppState writes the audit; the toast repeats its text. */
export function PauseButton({ className }: { className?: string }) {
  const { paused, togglePause } = useAppState()
  const toast = useToast()
  return (
    <button type="button" className={className ? `btn ${className}` : 'btn'} onClick={() => toast(togglePause())}>
      {paused ? PRIVACY_COPY.resume : PRIVACY_COPY.pause}
    </button>
  )
}
