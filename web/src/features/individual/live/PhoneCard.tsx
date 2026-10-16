'use client'

import { useTranslation } from 'react-i18next'
import { PhoneScreen } from '@/components/phone/PhoneScreen'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/components/ui/Toast'
import { emSteps, resolveStepView } from '@/domain/emergency'

/** `Margaret's screen` (c3): the phone, mirroring the question the agent is asking at this step. */
export function PhoneCard({ step }: { step: number }) {
  const toast = useToast()
  const { t } = useTranslation('live')
  const steps = emSteps()
  const s = steps[step]
  const { help } = resolveStepView(steps, step)
  return (
    <GlassCard id="liveC" className="c3">
      <div className="ch"><h2>{t('phone.title')}</h2><span className="meta">{t('phone.meta')}</span></div>
      <PhoneScreen
        time={s.t}
        q={s.e.q}
        small={s.e.small}
        flash={Boolean(s.e.flash)}
        listen={Boolean(s.e.listen)}
        help={help}
        helpName="David"
        yn={Boolean(s.e.yn)}
        onAnswer={(a) => toast(t('phone.answered', { a }))}
      />
      <p className="fine">{t('phone.note')}</p>
    </GlassCard>
  )
}
