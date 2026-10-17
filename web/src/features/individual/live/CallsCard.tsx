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
        {agent.calls.map((c, i) => (
          <div key={c.id} className={`ccard ${c.cls}${c.id === 'ooo' ? ' ooo' : ''}`.trim()}>
            <span className="n" aria-hidden="true">{c.id === 'ooo' ? '🚑' : i + 1}</span>
            {c.id === 'ooo'
              ? <span className="av sm" style={{ '--c': c.color } as CSSProperties}>{c.initials}</span>
              : <Avatar name={c.name} className="av sm" style={{ '--c': c.color } as CSSProperties}>{c.initials}</Avatar>}
            <span><b>{c.name}</b><small>{c.sub}</small></span>
            <em>{c.status}</em>
          </div>
        ))}
      </div>
      <div className="ch subh"><h2 style={small}>{t('agent.alerts.title')}</h2><span className="meta">{t('agent.alerts.meta')}</span></div>
      {agent.alerts.length ? (
        <ul className="alist">
          {agent.alerts.map((a) => (
            <li key={a.id} title={a.text}>
              <Avatar name={a.name} className="av sm">{a.initials}</Avatar>
              <span>{a.name}</span>
              <em>{a.sent}</em>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="list">
          <li><span className="li" aria-hidden="true">🔕</span><span><b>{t('agent.alerts.none')}</b><small>{t('agent.alerts.noneSub')}</small></span></li>
        </ul>
      )}
    </GlassCard>
  )
}
