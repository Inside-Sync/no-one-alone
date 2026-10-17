import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { AgentOrb } from '@/components/noa/AgentOrb'
import { NoaOrb } from '@/components/noa/NoaOrb'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph, Icon } from '@/components/ui/Icon'
import type { AgentView, Tone } from '@/domain/agent'
import { openChat } from '@/features/chat/events'

const LIGHTS: Tone[] = ['green', 'amber', 'red']
const dot = (tone: Tone) => `dot-${tone}` as const

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
      <div className="light" aria-hidden="true">
        {LIGHTS.map((tone) => (
          <div key={tone} className={agent.decision?.tone === tone ? `on ${tone}` : ''}><b><Glyph name={dot(tone)} />{t(`agent.light.${tone}`)}</b>{t(`agent.light.${tone}Sub`)}</div>
        ))}
      </div>
      {agent.decision ? (
        <div className={`dec ${agent.decision.tone}`}><b><Glyph name={dot(agent.decision.tone)} />{agent.decision.title}</b><span>{agent.decision.text}</span></div>
      ) : (
        <div className="dec none"><b>{t('agent.pending.title')}</b><span>{t('agent.pending.text', { num }).split(' · ').map((seg, i) => (
          <Fragment key={i}>{i > 0 && ' · '}<Glyph name={dot(LIGHTS[Math.min(i, 2)])} />{seg}</Fragment>
        ))}</span></div>
      )}
      <div className="saynow"><NoaOrb size={22} /><p className="agent-now" aria-live="polite">{agent.now}</p></div>
      <ol className="steps2">
        {agent.steps.map((s) => (
          <li key={s.key} className={s.state || 'todo'}><span className="d" aria-hidden="true">{s.state === 'done' ? '✓' : <span className="ic"><Icon name={s.icon} /></span>}</span><span>{s.label}</span><em>{s.note}</em></li>
        ))}
      </ol>
    </GlassCard>
  )
}
