import type { AgentId, DomainId, FhIcon, Mode, RuleId, StageId } from './types'
import { RULE_IDS } from './types'

/**
 * The agent team (prototype AG and DOM): the Orchestrator conducts four domain agents, each with skills. Texts:
 * `agents.<id>.{name,role,can,cannot}` and `domains.<id>.{name,sub,does}`.
 */
export interface Agent { id: AgentId; domain: DomainId; icon: FhIcon; mode: Mode }
export const AGENTS: Record<AgentId, Agent> = {
  orch: { id: 'orch', domain: 'orch', icon: 'puzzle', mode: 'sys' },
  guardian: { id: 'guardian', domain: 'care', icon: 'shield', mode: 'ind' },
  voice: { id: 'voice', domain: 'care', icon: 'speech', mode: 'ind' },
  coach: { id: 'coach', domain: 'care', icon: 'graduation-cap', mode: 'ind' },
  forecast: { id: 'forecast', domain: 'screen', icon: 'trend', mode: 'ind' },
  navigator: { id: 'navigator', domain: 'screen', icon: 'compass', mode: 'gov' },
  courier: { id: 'courier', domain: 'spec', icon: 'package', mode: 'hosp' },
  insight: { id: 'insight', domain: 'spec', icon: 'search', mode: 'hosp' },
  analyst: { id: 'analyst', domain: 'gov', icon: 'chart-column', mode: 'gov' },
}
export interface Domain { id: DomainId; icon: FhIcon }
export const DOMAINS: Record<DomainId, Domain> = {
  care: { id: 'care', icon: 'home' },
  screen: { id: 'screen', icon: 'clinic' },
  spec: { id: 'spec', icon: 'xray' },
  gov: { id: 'gov', icon: 'landmark' },
  orch: { id: 'orch', icon: 'conductor' },
}
/** The four domain boxes of the orchestra, in display order. */
export const DOMAIN_ORDER: readonly Exclude<DomainId, 'orch'>[] = ['care', 'screen', 'spec', 'gov']
/** Skills per domain, in the prototype order (Object.keys(AG) filtered by domain). */
export const skillsOf = (d: DomainId): AgentId[] => (Object.keys(AGENTS) as AgentId[]).filter((a) => AGENTS[a].domain === d)
export const domainOf = (a: AgentId): DomainId => AGENTS[a].domain

/** Rule texts are `rules.<code>` in the locale; this list keeps the 34 codes in the prototype order. */
export const RULES: readonly RuleId[] = RULE_IDS

/** The five journey stages and their mode (prototype STAGES). Texts: `stages.<id>.{name,title,body,you}`. */
export const STAGES: Record<StageId, { mode: Mode }> = {
  detect: { mode: 'ind' }, protect: { mode: 'ind' }, home: { mode: 'ind' }, pathway: { mode: 'gov' }, referral: { mode: 'hosp' },
}
