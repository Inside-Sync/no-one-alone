'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { OnceButton } from '@/components/ui/OnceButton'

/** `🏥 In an emergency` (c6), with the hospital-sharing note for clinicians. */
export function EmergencyCard() {
  const { t } = useTranslation('privacy')
  return (
    <GlassCard span={6}>
      <div className="ch"><h2>{t('emergency.title')}</h2><span className="meta">{t('emergency.meta')}</span></div>
      <p style={{ fontSize: '13.5px' }}>{t('emergency.text')}</p>
      <div className="row">
        {[t('emergency.agreement', { returnObjects: true }), t('emergency.contacts', { returnObjects: true })].map(([label, toast, done]) => (
          <OnceButton key={label} className="soft" toast={toast} done={`✓ ${done}`}>{label}</OnceButton>
        ))}
      </div>
      <p className="fine">{t('emergency.clinician')}</p>
    </GlassCard>
  )
}
