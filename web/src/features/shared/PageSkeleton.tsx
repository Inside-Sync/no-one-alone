'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard, type CardSpan } from '@/components/ui/GlassCard'

const CARDS: CardSpan[] = [8, 4, 4, 4, 4, 12]

/** Shown in place of a page while its data loads: glass cards with shimmer lines, so the screen is never blank. */
export function PageSkeleton({ page }: { page: string }) {
  const { t } = useTranslation()
  return (
    <main className="grid" data-page={page} aria-busy="true" aria-label={t('pageLoading')}>
      {CARDS.map((span, i) => (
        <GlassCard key={i} span={span} className="skel-card">
          <span className="skel" style={{ width: '40%', height: 14 }} />
          <span className="skel" style={{ width: '70%', height: 22 }} />
          <span className="skel" style={{ width: '100%', height: span === 8 ? 220 : 72 }} />
        </GlassCard>
      ))}
    </main>
  )
}
