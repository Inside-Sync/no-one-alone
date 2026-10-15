'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'

/**
 * Shown in place of a page whose data could not be read (Final review, finding 3). Not in the prototype,
 * which never fails to load: one glass card, one sentence, and a button that runs the load again.
 */
export function PageError({ page, onRetry }: { page: string; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <main className="grid" data-page={page}>
      <GlassCard span={12}>
        <div role="alert" className="row" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 14, margin: 0 }}>{t('pageError.text')}</p>
          <button type="button" className="btn soft" onClick={onRetry}>{t('pageError.retry')}</button>
        </div>
      </GlassCard>
    </main>
  )
}
