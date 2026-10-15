'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { lockMessage, sees, type CategoryId } from '@/domain/consent'
import { useAppState } from '@/state/AppState'
import { useDrawer } from './Drawer'
import type { CardSpan } from './GlassCard'
import { OnceButton } from './OnceButton'

interface Props {
  cat: CategoryId
  /** Grid span of the placeholder card, so the layout does not jump. */
  span?: CardSpan
  className?: string
  children: ReactNode
}

/**
 * Wraps a card that belongs to a consent category. When the current family
 * viewer may not see it (or consent is still loading), the children are NOT
 * rendered: only a blurred placeholder with the prototype's lock message.
 */
export function Locked({ cat, span, className, children }: Props) {
  const { t } = useTranslation()
  const { who, viewer, paused, share, people } = useAppState()
  const drawer = useDrawer()
  if (who !== 'family') return <>{children}</>
  if (share && sees(share, paused, viewer, cat)) return <>{children}</>
  const cls = ['glass', 'card', span ? `c${span}` : '', 'locked-slot', className ?? ''].filter(Boolean).join(' ')
  // Prototype `.locked` click: a "Kept private" sheet. James is the signed-in viewer, so it says "you".
  const name = people.find((p) => p.id === viewer)?.name ?? viewer
  const open = () => {
    const viewerName = name === 'James' ? t('you') : name
    drawer.open(
      t('keptPrivate.title'),
      <>
        <p style={{ fontSize: 14, lineHeight: 1.55 }}>{paused ? t('keptPrivate.bodyPaused', { viewerName }) : t('keptPrivate.body', { viewerName })}</p>
        <div className="row">
          <OnceButton toast={t('keptPrivate.action.toast')} done={`✓ ${t('keptPrivate.action.done')}`}>
            {t('keptPrivate.action.label')}
          </OnceButton>
        </div>
      </>,
    )
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }
  return (
    <div className={cls} data-scat={cat} role="button" tabIndex={0} onClick={open} onKeyDown={onKey}>
      <div className="locked-fill" aria-hidden="true" />
      <span className="locked-msg">
        <span aria-hidden="true">🔒&nbsp;&nbsp;</span>
        {share ? lockMessage(cat, paused) : t('lock.checking')}
      </span>
    </div>
  )
}
