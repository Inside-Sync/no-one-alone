import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

const hidden: CSSProperties = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }

/** A count or rate hidden by small-cell suppression: "<10" for the eye, the full reason for a screen reader. */
export function Suppressed({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <span className={className} title={t('suppression.label')} style={{ fontStyle: 'italic', opacity: 0.8 }}>
      {t('suppression.token')}
      <span style={hidden}>{` (${t('suppression.label')})`}</span>
    </span>
  )
}

/** The count, or "<10" when suppressed (null). */
export function CountOrSuppressed({ value }: { value: number | null }) {
  return value === null ? <Suppressed /> : <>{value}</>
}

/** The visible privacy note shown under a table or chart where something is hidden. */
export function SuppressionNote({ className = 'fine' }: { className?: string }) {
  const { t } = useTranslation()
  return <p className={className} role="note">{t('suppression.note')}</p>
}
