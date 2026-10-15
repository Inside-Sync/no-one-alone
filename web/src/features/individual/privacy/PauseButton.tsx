'use client'

import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { useAppState } from '@/state/AppState'

/** The pause / resume button (prototype `#pauseBtn`, `#pauseBtn2`). AppState writes the audit; the toast repeats its text. */
export function PauseButton({ className }: { className?: string }) {
  const { paused, togglePause } = useAppState()
  const toast = useToast()
  const { t } = useTranslation('privacy')
  return (
    <button type="button" className={className ? `btn ${className}` : 'btn'} onClick={() => toast(togglePause())}>
      {paused ? t('resume') : t('pause')}
    </button>
  )
}
