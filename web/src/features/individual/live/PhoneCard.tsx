'use client'

import { PhoneScreen } from '@/components/phone/PhoneScreen'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/components/ui/Toast'
import { LIVE_COPY } from '@/data/repo'
import { resolveStepView, STEPS } from '@/domain/emergency'

/** `Margaret's screen` (c3): the phone, mirroring the question the agent is asking at this step. */
export function PhoneCard({ step }: { step: number }) {
  const toast = useToast()
  const c = LIVE_COPY.phone
  const s = STEPS[step]
  const { help } = resolveStepView(STEPS, step)
  return (
    <GlassCard id="liveC" className="c3">
      <div className="ch"><h2>{c.title}</h2><span className="meta">{c.meta}</span></div>
      <PhoneScreen
        time={s.t}
        q={s.e.q}
        small={s.e.small}
        flash={Boolean(s.e.flash)}
        listen={Boolean(s.e.listen)}
        help={help}
        yn={Boolean(s.e.yn)}
        onAnswer={(a) => toast(c.answered(a))}
      />
      <p className="fine">{c.note}</p>
    </GlassCard>
  )
}
