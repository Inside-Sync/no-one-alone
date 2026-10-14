'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { OnceButton } from '@/components/ui/OnceButton'
import { PRIVACY_COPY } from '@/data/repo'

/** `🏥 In an emergency` (c6), with the hospital-sharing note for clinicians. */
export function EmergencyCard() {
  const c = PRIVACY_COPY.emergency
  return (
    <GlassCard span={6}>
      <div className="ch"><h2>{c.title}</h2><span className="meta">{c.meta}</span></div>
      <p style={{ fontSize: '13.5px' }}>{c.text}</p>
      <div className="row">
        {[c.agreement, c.contacts].map(([label, toast, done]) => (
          <OnceButton key={label} className="soft" toast={toast} done={`✓ ${done}`}>{label}</OnceButton>
        ))}
      </div>
      <p className="fine">{c.clinician}</p>
    </GlassCard>
  )
}
