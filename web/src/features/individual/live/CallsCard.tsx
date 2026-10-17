import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/ui/Avatar'
import { GlassCard } from '@/components/ui/GlassCard'
import type { AgentView } from '@/domain/agent'

const small: CSSProperties = { fontSize: 14 }

/** `Calls in order` and `Alerts to her circle` (c4). */
export function CallsCard({ agent }: { agent: AgentView }) {
  const { t } = useTranslation('live')
  return (
    <GlassCard span={4} id="callsCard">
      <div className="ch"><h2>{t('agent.calls.title')}</h2><span className="meta">{t('agent.calls.meta')}</span></div>
      <div className="callcards">
        {agent.calls.map((c) => (
          <div key={c.id} className={`ccard ${c.cls}`.trim()}>
            {c.id === 'ooo'
              ? <span className="av sm" style={{ '--c': c.color } as CSSProperties}>{c.initials}</span>
              : <Avatar name={c.name} className="av sm" style={{ '--c': c.color } as CSSProperties}>{c.initials}</Avatar>}
            <span><b>{c.name}</b><small>{c.sub}</small></span>
            <em>{c.status}</em>
          </div>
        ))}
      </div>
      <div className="ch"><h2 style={small}>{t('agent.alerts.title')}</h2><span className="meta">{t('agent.alerts.meta')}</span></div>
      <ul className="list">
        {agent.alerts.length ? agent.alerts.map((a) => (
          <li key={a.id}>
            <Avatar name={a.name} className="av sm">{a.initials}</Avatar>
            <span><b>{a.name}</b><small>{a.text}</small></span>
            <span className="pill good">{a.sent}</span>
          </li>
        )) : (
          <li><span className="li" aria-hidden="true">🔕</span><span><b>{t('agent.alerts.none')}</b><small>{t('agent.alerts.noneSub')}</small></span></li>
        )}
      </ul>
    </GlassCard>
  )
}
