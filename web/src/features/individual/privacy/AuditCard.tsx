'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { useAppState } from '@/state/AppState'

/** `Changes you made` (c6): this session's audit log, newest first. */
export function AuditCard() {
  const { audit } = useAppState()
  const { t } = useTranslation('privacy')
  return (
    <GlassCard span={6}>
      <div className="ch"><h2><Glyph name="receipt" />{t('audit.title')}</h2><span className="meta">{t('audit.meta')}</span></div>
      {audit.length === 0 ? (
        <p className="fine">{t('audit.empty')}</p>
      ) : (
        <ul className="list" aria-label={t('audit.label')}>
          {[...audit].reverse().map((e, i) => (
            <li key={audit.length - i}>
              <span><b>{e.detail}</b><small>{e.at} · {e.who}</small></span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}
