// Ported from the Test case prototype (new4.html). Every user-visible string is an i18n key in the `testcase`
// namespace (see locales/en/testcase.json); numbers, thresholds, ids and order are the prototype's.
import type { AgentDef, AgentId, Mode, PipeNode } from './types'

/** The eight Noa agents (prototype AG). `n` is the short name ("Guardian"); texts are keys. */
export const AGENTS: Record<AgentId, AgentDef> = {
  guardian: {
    id: 'guardian',
    icon: 'shield',
    n: 'agents.guardian.n',
    role: 'agents.guardian.role',
    can: 'agents.guardian.can',
    cannot: 'agents.guardian.cannot',
    story: 'agents.guardian.story',
  },
  voice: {
    id: 'voice',
    icon: 'speech',
    n: 'agents.voice.n',
    role: 'agents.voice.role',
    can: 'agents.voice.can',
    cannot: 'agents.voice.cannot',
    story: 'agents.voice.story',
  },
  responder: {
    id: 'responder',
    icon: 'phone',
    n: 'agents.responder.n',
    role: 'agents.responder.role',
    can: 'agents.responder.can',
    cannot: 'agents.responder.cannot',
    story: 'agents.responder.story',
  },
  courier: {
    id: 'courier',
    icon: 'package',
    n: 'agents.courier.n',
    role: 'agents.courier.role',
    can: 'agents.courier.can',
    cannot: 'agents.courier.cannot',
    story: 'agents.courier.story',
  },
  insight: {
    id: 'insight',
    icon: 'search',
    n: 'agents.insight.n',
    role: 'agents.insight.role',
    can: 'agents.insight.can',
    cannot: 'agents.insight.cannot',
    story: 'agents.insight.story',
  },
  forecast: {
    id: 'forecast',
    icon: 'trend',
    n: 'agents.forecast.n',
    role: 'agents.forecast.role',
    can: 'agents.forecast.can',
    cannot: 'agents.forecast.cannot',
    story: 'agents.forecast.story',
  },
  coach: {
    id: 'coach',
    icon: 'graduation-cap',
    n: 'agents.coach.n',
    role: 'agents.coach.role',
    can: 'agents.coach.can',
    cannot: 'agents.coach.cannot',
    story: 'agents.coach.story',
  },
  navigator: {
    id: 'navigator',
    icon: 'compass',
    n: 'agents.navigator.n',
    role: 'agents.navigator.role',
    can: 'agents.navigator.can',
    cannot: 'agents.navigator.cannot',
    story: 'agents.navigator.story',
  },
  analyst: {
    id: 'analyst',
    icon: 'chart-column',
    n: 'agents.analyst.n',
    role: 'agents.analyst.role',
    can: 'agents.analyst.can',
    cannot: 'agents.analyst.cannot',
    story: 'agents.analyst.story',
  },
}

export const AGENT_IDS: AgentId[] = ['guardian', 'voice', 'responder', 'courier', 'insight', 'forecast', 'coach', 'navigator', 'analyst']

/** Mode names (prototype MNAME). */
export const MODE_NAME: Record<Mode, string> = { ind: 'modes.ind', hosp: 'modes.hosp', gov: 'modes.gov' }

/** The seven pipeline nodes the data flow lights up (index = the `node` of a step's `pipe`). */
export const NODES: PipeNode[] = [
  { kind: 'ind', who: 'nodes.0.who', name: 'nodes.0.name' },
  { kind: 'ind', who: 'nodes.1.who', name: 'nodes.1.name' },
  { kind: 'ind', who: 'nodes.2.who', name: 'nodes.2.name' },
  { kind: 'gate', who: 'nodes.3.who', name: 'nodes.3.name' },
  { kind: 'agent', who: 'nodes.4.who', name: 'nodes.4.name' },
  { kind: 'hosp', who: 'nodes.5.who', name: 'nodes.5.name' },
  { kind: 'gov', who: 'nodes.6.who', name: 'nodes.6.name' },
]

