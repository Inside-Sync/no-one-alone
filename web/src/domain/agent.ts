/**
 * The Emergency page's agent column (prototype `drawSim`): Noa's steps, the decision, who is called in which order and
 * which alerts went out, all read from the live incident (contract 2.3). Pure, like `incident.ts`: labels come from
 * the `live` namespace at call time; text written by the backend (timeline entries, alert messages) is shown as is.
 */
import i18n from '@/i18n'
import type { IconName } from '@/data/types'
import type { AssignmentDoc, CircleEntryDoc, IncidentDoc, LatLng, TimelineDoc, TimelineKind } from '@/data/contract'
import { clockTime, memberName, type LivePeople } from './incident'

export type StepState = '' | 'done' | 'cur' | 'fail' | 'skip'
export type Tone = 'green' | 'amber' | 'red'

export interface AgentStep { key: string; icon: IconName; label: string; state: StepState; note: string }
export interface CallRow { id: string; name: string; initials: string; color: string; sub: string; status: string; cls: '' | 'ring' | 'miss' | 'ok' }
export interface AlertRow { id: string; name: string; initials: string; text: string; sent: string }

export interface AgentView {
  label: string
  pill: 'plain' | 'bad' | 'good'
  decision: { tone: Tone; title: string; text: string } | null
  now: string
  steps: AgentStep[]
  calls: CallRow[]
  alerts: AlertRow[]
}

const tl = (key: string, opts?: Record<string, unknown>): string => (i18n.t as (k: string, o?: object) => string)(`live:agent.${key}`, opts)
const first = (s: string) => s.split(' ')[0]
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
const has = (inc: IncidentDoc, k: TimelineKind) => inc.timeline.some((e) => e.kind === k)
const entry = (inc: IncidentDoc, k: TimelineKind): TimelineDoc | undefined => inc.timeline.find((e) => e.kind === k)
const SPEECH_CHECK = /sky is blue in sydney|trời sydney hôm nay xanh/i
/** Initials colours of the prototype's call cards, by call order; 000 is always red. */
const COLORS = ['#e07a3f', '#2f6fb0', '#7a5bd1', '#c2417a']

/** Metres between two points (haversine). */
function metres(a: LatLng, b: LatLng): number {
  const r = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

const distance = (m: number) => (m < 1000 ? tl('m', { n: Math.round(m / 10) * 10 }) : tl('km', { n: (m / 1000).toFixed(1) }))

/** core-api's call queue (see `incident.ts`): critical-alert members by priority, DISTANT ones only before the first NEARBY. */
function callQueue(people: LivePeople): CircleEntryDoc[] {
  const circle = [...(people.person?.circle ?? [])].filter((c) => c.criticalAlerts).sort((a, b) => a.priority - b.priority)
  const firstNearby = Math.min(...circle.filter((c) => c.role === 'NEARBY').map((c) => c.priority))
  return circle.filter((c) => c.role === 'NEARBY' || c.priority < firstNearby)
}

function relation(r: string): string {
  const k = `relation.${r.toLowerCase()}`
  return i18n.exists(`live:agent.${k}`) ? tl(k) : r[0].toUpperCase() + r.slice(1)
}

/** `Son · priority 1`, `Brother · nearest, 450 m`. `detail` is the short form the steps use. */
function who(people: LivePeople, queue: CircleEntryDoc[], c: CircleEntryDoc, k: number) {
  const home = people.person?.location
  const loc = people.members[c.memberId]?.location
  const away = home && loc ? distance(metres(home, loc)) : null
  const nearest = queue.find((x) => x.role === 'NEARBY') === c
  const detail = k === 0 ? tl('priority', { n: c.priority }) : c.role === 'NEARBY' && away ? away : tl('priority', { n: c.priority })
  const tail = k === 0 ? tl('priority', { n: c.priority }) : nearest && away ? tl('nearest', { d: away }) : detail
  return { sub: `${relation(c.relation)} · ${tail}`, detail }
}

function callStatus(a: AssignmentDoc | undefined): { status: string; cls: CallRow['cls'] } {
  switch (a?.state) {
    case 'NOTIFIED': return { status: tl('call.ringing'), cls: 'ring' }
    case 'ACCEPTED': return { status: tl(a.role === 'NEARBY' ? 'call.onTheWay' : 'call.answered'), cls: 'ok' }
    case 'ARRIVED': return { status: tl('call.withHer'), cls: 'ok' }
    case 'DECLINED': return { status: tl('call.declined'), cls: 'miss' }
    case 'EXPIRED': return { status: tl(a.role === 'DISTANT' ? 'call.voicemail' : 'call.text'), cls: 'miss' }
    default: return { status: tl('call.waiting'), cls: '' }
  }
}

const stepOf = (a: AssignmentDoc | undefined): StepState =>
  a?.state === 'NOTIFIED' ? 'cur' : a?.state === 'ACCEPTED' || a?.state === 'ARRIVED' ? 'done' : a?.state === 'DECLINED' || a?.state === 'EXPIRED' ? 'fail' : ''

const toneOf = (inc: IncidentDoc): Tone | null =>
  inc.verify && !inc.verify.isReal ? 'green'
    : inc.level === 'EMERGENCY' ? 'red' : inc.level === 'COME_NOW' ? 'amber' : inc.level === 'OK' || inc.level === 'MONITOR' ? 'green' : null

/** The check-in steps: ask, speech test, how she feels. */
function checkSteps(inc: IncidentDoc): Record<'ask' | 'speech' | 'feel', StepState> {
  const turns = inc.checkIn?.turns ?? []
  const asks = turns.map((t, i) => ({ t, i })).filter(({ t }) => t.by === 'AGENT')
  const speechAt = asks.find(({ t }) => SPEECH_CHECK.test(t.text))?.i ?? -1
  const triaged = has(inc, 'TRIAGED') || (inc.status !== 'VERIFYING' && inc.status !== 'CHECKING_IN')
  const reply = (from: number) => turns.slice(from + 1).find((t) => t.by === 'PERSON')
  const clarity = speechAt >= 0 ? reply(speechAt)?.assessment?.clarity : undefined
  const feelAt = speechAt >= 0 ? asks.find(({ i }) => i > speechAt)?.i ?? -1 : -1
  const checking = inc.status === 'CHECKING_IN'
  const ask: StepState = inc.status === 'VERIFYING' ? '' : speechAt >= 0 || triaged ? 'done' : checking ? 'cur' : ''
  const speech: StepState = speechAt < 0 ? (triaged ? 'skip' : '')
    : clarity === 'CLEAR' ? 'done' : clarity === 'SLURRED' || clarity === 'NO_SPEECH' ? 'fail' : triaged ? 'fail' : 'cur'
  const feel: StepState = feelAt >= 0 ? (triaged || reply(feelAt) ? 'done' : 'cur') : triaged ? 'skip' : ''
  return { ask, speech, feel }
}

function escalationSteps(inc: IncidentDoc, people: LivePeople, tone: Tone): AgentStep[] {
  const queue = callQueue(people)
  const num = people.person?.emergencyNumber ?? '000'
  const closed = inc.status === 'CLOSED' || inc.status === 'ON_SCENE'
  const steps: Omit<AgentStep, 'note'>[] = [{ key: 'alertall', icon: 'bell', label: tl('step.alertAll'), state: has(inc, 'ALERTED') ? 'done' : 'cur' }]
  queue.forEach((c, k) => {
    const a = (inc.assignments ?? []).find((x) => x.memberId === c.memberId)
    const prev = queue[k - 1]
    if (c.role === 'NEARBY' && prev?.role === 'DISTANT') {
      const scanned = Boolean(a && a.state !== 'QUEUED')
      const prevDone = stepOf((inc.assignments ?? []).find((x) => x.memberId === prev.memberId)) === 'fail'
      steps.push({ key: 'scan', icon: 'map-pin', label: tl('step.scan'), state: scanned ? 'done' : prevDone ? 'cur' : closed ? 'skip' : '' })
    }
    const s = stepOf(a)
    steps.push({ key: `call-${c.memberId}`, icon: 'phone', label: tl('step.call', { name: first(memberName(people, c.memberId)), detail: who(people, queue, c, k).detail }), state: s || (closed ? 'skip' : '') })
  })
  const called = has(inc, 'CALLED_115')
  const ooo: StepState = called ? 'done' : has(inc, 'NO_NEARBY') ? 'cur' : closed ? 'skip' : ''
  if (tone === 'red' || called) steps.push({ key: 'ooo', icon: 'ambulance', label: tl('step.ooo', { num }), state: ooo })
  const h = inc.handoff?.status
  steps.push({ key: 'packet', icon: 'hospital', label: tl('step.packet'), state: h === 'RECEIVED' ? 'done' : h === 'FAILED' ? 'fail' : h === 'PENDING' || has(inc, 'HANDOFF_SENT') ? 'cur' : '' })
  const helping = Boolean(inc.ownerId) || called
  steps.push({ key: 'company', icon: 'handshake', label: tl(called ? 'step.paramedics' : 'step.company'), state: closed ? 'done' : helping && h !== 'PENDING' ? 'cur' : '' })
  return steps.map((s) => ({ ...s, note: '' }))
}

function greenSteps(inc: IncidentDoc): Omit<AgentStep, 'note'>[] {
  const done = inc.status === 'CLOSED'
  return (['g1', 'g2', 'g3'] as const).map((k, i) => ({
    key: k, icon: (['coffee', 'timer', 'notebook-pen'] as const)[i], label: tl(`step.${k}`), state: done ? 'done' : i === 0 ? 'cur' : '',
  }))
}

function noteOf(key: string, s: StepState): string {
  if (s === 'fail' && key.startsWith('call-')) return tl('state.noAnswer')
  return s ? tl(`state.${s}`) : ''
}

/** The current step's label for the pill (`Checking on her`, `Calling James`). */
function pillLabel(inc: IncidentDoc | null, steps: AgentStep[], people: LivePeople): string {
  if (!inc) return tl('pill.watching')
  if (inc.verify && !inc.verify.isReal) return tl('pill.falseAlarm')
  if (inc.status === 'CLOSED') return tl(toneOf(inc) === 'green' ? 'pill.allClear' : 'pill.handedOver')
  if (inc.status === 'ON_SCENE') return tl('pill.withHer')
  if (inc.status === 'VERIFYING') return tl('pill.verifying')
  const cur = steps.find((s) => s.state === 'cur')
  if (!cur) return tl('pill.deciding')
  if (cur.key.startsWith('call-')) return tl('pill.calling', { name: first(memberName(people, cur.key.slice(5))) })
  return tl(`pill.${cur.key}`, { num: people.person?.emergencyNumber ?? '000' })
}

export function agentView(inc: IncidentDoc | null, people: LivePeople): AgentView {
  const name = first(people.person?.displayName ?? tl('her'))
  const tz = people.person?.timezone ?? 'Asia/Ho_Chi_Minh'
  const queue = callQueue(people)
  const num = people.person?.emergencyNumber ?? '000'
  const base: Omit<AgentStep, 'note'>[] = [
    { key: 'detect', icon: 'search', label: tl('step.detect'), state: '' },
    { key: 'ask', icon: 'message-circle', label: tl('step.ask', { name }), state: '' },
    { key: 'speech', icon: 'speech', label: tl('step.speech'), state: '' },
    { key: 'feel', icon: 'stethoscope', label: tl('step.feel'), state: '' },
    { key: 'decide', icon: 'compass', label: tl('step.decide'), state: '' },
  ]
  const calls: CallRow[] = queue.map((c, k) => {
    const n = memberName(people, c.memberId)
    const a = inc?.assignments?.find((x) => x.memberId === c.memberId)
    return { id: c.memberId, name: first(n), initials: initials(n), color: COLORS[k % COLORS.length], sub: who(people, queue, c, k).sub, ...callStatus(a) }
  })
  const called = inc ? entry(inc, 'CALLED_115') : undefined
  const ooo: Pick<CallRow, 'status' | 'cls'> = called
    ? { status: tl(inc?.handoff?.status === 'RECEIVED' || inc?.status === 'ON_SCENE' || inc?.status === 'CLOSED' ? 'call.dispatched' : 'call.connected'), cls: 'ok' }
    : inc && has(inc, 'NO_NEARBY') ? { status: tl('call.dialling'), cls: 'ring' } : { status: tl('call.notNeeded'), cls: '' }
  calls.push({ id: 'ooo', name: num, initials: num, color: '#ef4e4a', sub: tl('ambulance'), ...ooo })

  if (!inc) {
    const steps = base.map((s) => ({ ...s, note: '' }))
    return { label: pillLabel(null, steps, people), pill: 'plain', decision: null, now: tl('idle'), steps, calls, alerts: [] }
  }

  const check = checkSteps(inc)
  const tone = toneOf(inc)
  const triaged = Boolean(tone) && inc.status !== 'VERIFYING' && inc.status !== 'CHECKING_IN'
  base[0].state = inc.status === 'VERIFYING' ? 'cur' : 'done'
  base[1].state = check.ask
  base[2].state = check.speech
  base[3].state = check.feel
  base[4].state = triaged || has(inc, 'TRIAGED') ? 'done' : inc.checkIn?.done ? 'cur' : ''
  if (inc.verify && !inc.verify.isReal) base.slice(1).forEach((s) => { s.state = 'skip' })
  const branch = !triaged || !tone ? [] : tone === 'green' ? greenSteps(inc) : escalationSteps(inc, people, tone)
  const steps = [...base, ...branch].map((s) => ({ ...s, note: noteOf(s.key, s.state) }))

  const reason = inc.triage?.reasons[0]
  const why = reason ? reason[0].toUpperCase() + reason.slice(1) + '. ' : ''
  const scenario = inc.scenario === 'STROKE' ? 'stroke' : inc.scenario === 'FALL' ? 'fall' : 'other'
  const decision = triaged && tone ? { tone, title: tl(`decision.${tone}.title.${scenario}`), text: why + tl(`decision.${tone}.text`) } : null

  const alerted = entry(inc, 'ALERTED')
  const message = alerted ? alerted.text.slice(alerted.text.indexOf(': ') + 2) : ''
  const alerts: AlertRow[] = alerted
    ? [...(people.person?.circle ?? [])].filter((c) => c.criticalAlerts).sort((a, b) => a.priority - b.priority).map((c) => {
        const n = memberName(people, c.memberId)
        return { id: c.memberId, name: first(n), initials: initials(n), text: message, sent: tl('sent', { time: clockTime(alerted.at, tz) }) }
      })
    : []

  // Before the decision the agent says why it stepped in; afterwards, the latest thing it did.
  const hr = inc.alert.hr ?? '—'
  const after = inc.timeline.filter((e) => e.kind !== 'ASKED' && e.kind !== 'ANSWERED' && e.kind !== 'NO_REPLY')
  const now = !triaged
    ? (inc.verify && !inc.verify.isReal ? inc.verify.reason : tl(inc.alert.kind === 'FALL_IMPACT_NO_MOVEMENT' ? 'nowFall' : 'nowHr', { hr, name }))
    : after[after.length - 1]?.text ?? ''

  return {
    label: pillLabel(inc, steps, people),
    pill: inc.status === 'CLOSED' || inc.status === 'ON_SCENE' ? 'good' : 'bad',
    decision, now, steps, calls, alerts,
  }
}

/** `Margaret's circle` at rest: `David 460 m · James and Sarah far away` (critical-alert members only). */
export function circleAtRest(people: LivePeople): string {
  const home = people.person?.location
  const circle = [...(people.person?.circle ?? [])].filter((c) => c.criticalAlerts).sort((a, b) => a.priority - b.priority)
  const near = circle.filter((c) => c.role === 'NEARBY').map((c) => {
    const loc = people.members[c.memberId]?.location
    return `${first(memberName(people, c.memberId))}${home && loc ? ` ${distance(metres(home, loc))}` : ''}`
  })
  const far = circle.filter((c) => c.role === 'DISTANT').map((c) => first(memberName(people, c.memberId)))
  const names = far.length > 1 ? `${far.slice(0, -1).join(', ')}${tl('circle.and')}${far[far.length - 1]}` : far[0]
  return [...near, ...(names ? [tl('circle.farAway', { names })] : [])].join(' · ')
}

/** Tone of an incident for the circle card: `bad` red, `warn` amber, `good` green or none. */
export function circleTone(inc: IncidentDoc | null): 'bad' | 'warn' | 'good' | 'plain' {
  if (!inc) return 'plain'
  const tone = toneOf(inc)
  return tone === 'green' ? 'good' : tone === 'amber' ? 'warn' : tone === 'red' || inc.status !== 'CLOSED' ? 'bad' : 'plain'
}
