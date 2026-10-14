'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { PRIVACY_COPY } from '@/data/repo'
import { useAppState } from '@/state/AppState'

/** `🧾 Changes you made` (c6): this session's audit log, newest first. */
export function AuditCard() {
  const { audit } = useAppState()
  const c = PRIVACY_COPY.audit
  return (
    <GlassCard span={6}>
      <div className="ch"><h2>{c.title}</h2><span className="meta">{c.meta}</span></div>
      {audit.length === 0 ? (
        <p className="fine">{c.empty}</p>
      ) : (
        <ul className="list" aria-label={c.label}>
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
