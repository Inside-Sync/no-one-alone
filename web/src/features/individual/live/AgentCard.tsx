import { useTranslation } from 'react-i18next'
import { AgentOrb } from '@/components/noa/AgentOrb'
import { GlassCard } from '@/components/ui/GlassCard'
import type { AgentView } from '@/domain/agent'
import { openChat } from '@/features/chat/events'

/** `Noa · your No One Alone agent` (c4): state, the decision, what Noa is doing now and every step. */
export function AgentCard({ agent, num }: { agent: AgentView; num: string }) {
  const { t } = useTranslation('live')
  const active = agent.pill === 'bad'
  return (
    <GlassCard span={4} id="agentCard">
      <div className="ch">
        <h2 className="orbh"><AgentOrb size={40} talk={active} alert={active} /><span className="orbname">{t('agent.title')}<small className="orbsub">{t('agent.sub')}</small></span></h2>
        <span className={`pill ${agent.pill}`} id="agentState">{agent.label}</span>
        <button type="button" className="btn sm soft" style={{ marginLeft: 8 }} onClick={openChat}>{t('agent.ask')}</button>
      </div>
      {agent.decision ? (
        <div className={`dec ${agent.decision.tone}`}><b>{agent.decision.title}</b><span>{agent.decision.text}</span></div>
      ) : (
        <div className="dec none"><b>{t('agent.pending.title')}</b><span>{t('agent.pending.text', { num })}</span></div>
      )}
      <p className="agent-now" aria-live="polite">{agent.now}</p>
      <ol className="steps2">
        {agent.steps.map((s) => (
          <li key={s.key} className={s.state}><span aria-hidden="true">{s.icon}</span><span>{s.label}</span><em>{s.note}</em></li>
        ))}
      </ol>
    </GlassCard>
  )
}
