/**
 * The live emergency (VITE_DATA_SOURCE=firebase): what the Live and Pre-arrivals pages show for one incident
 * document (contract 2.3). Pure; no React, no clock: `now` is story time (`Date.now() + demo.clockOffsetMs`, see
 * lib/clock), so every countdown compares story time with story time.
 *
 * Every label is looked up in the `live` namespace at call time (`i18n.t`), so recomputing the view after a language
 * change gives the new language. Text written by the backend (timeline entries, agent questions, triage reasons,
 * the call script, packet findings) is shown as is.
 */
import i18n from '@/i18n'
import type {
  AssignmentAction, AssignmentDoc, IncidentDoc, PacketDoc, PersonDoc, ServerAction, TimelineDoc, TimelineKind,
} from '@/data/contract'
import type { LabelValue, OrbitScene } from '@/data/types'
import type { EmLevel, EmOrbitTargets, EmPhase } from './emergency'

/** Seed people the view names members from (the subject plus their circle). */
export interface LivePeople {
  person: PersonDoc | null
  members: Record<string, PersonDoc>
}

export interface LiveTimelineRow {
  kind: TimelineKind
  t: string
  ph: string
  d: string
  s: string
}

export interface LivePhone {
  time: string
  q: string
  small?: string
  flash: boolean
  /** Yes / No buttons (`checkIn.pending.kind` YES_NO or LARGE_TEXT mode). */
  yn: boolean
  /** The agent asked by voice: the screen can record a reply. */
  voice: boolean
  /** A reply is being processed: input is disabled (`checkIn.busy`). */
  busy: boolean
  help: string | null
  /** First name of the helper on the way, for the photo on the help bubble. */
  helperName: string | null
  /** First name of the person calling while the alert is being verified (ringing). */
  callerName: string | null
  /** Seconds before the screen posts `noReply` while a question waits (`demo.noReplySeconds`). */
  noReplySeconds: number
  /** Changes whenever a new question is shown: the no-reply timer and the autoplay key off it. */
  questionKey: string | null
  /** Audio to autoplay: the pending question or the instruction (contract 2.6). */
  audioPath: string | null
  /** What the helper is doing after the plan, spoken once per `key`; null until the instruction exists. */
  status: HelperStatus | null
}

export interface HelperStatus { text: string; clip: string | null; key: string }

export interface MemberButtons {
  memberId: string
  name: string
  assignment: AssignmentDoc
  /** Buttons the member's screen shows; the client-only call buttons included. */
  actions: AssignmentAction[]
}

export interface LiveView {
  id: string
  open: boolean
  levelLabel: string
  minutes: number
  storyTime: string
  what: string
  sub: string
  owner: { name: string; initials: string; title: string; subtitle: string; eta: string }
  timeline: LiveTimelineRow[]
  sla: [label: string, value: string | null][]
  phone: LivePhone
  orbit: EmOrbitTargets
  callScript: string | null
  emergencyNumber: string
  personName: string
  /** Pre-arrivals: null until hospital-agent returned the packet. */
  packet: { meta: string; summary: string; rows: LabelValue[]; incoming: { eta: string; presenting: string; patient: string } } | null
  /** Pre-arrivals pathway progress, in the prototype's step numbers (7 packet, 8 on scene, 9 closed). */
  pathwayStep: number | null
}

const first = (s: string) => s.split(' ')[0]
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
const ms = (iso?: string) => (iso ? Date.parse(iso) : NaN)

/** `HH:mm` of an ISO time in the person's timezone (contract: screens convert to the viewer's timezone). */
export function clockTime(iso: string | number, timeZone = 'Asia/Ho_Chi_Minh'): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(new Date(iso))
}

/** `live:` lookup by a built key (`incident.owner.${k}`); the namespace's JSON holds every key used here. */
const tl = (key: string, opts?: Record<string, unknown>): string => (i18n.t as (k: string, o?: object) => string)(`live:${key}`, opts)
const min = (n: number) => tl('units.min', { n })

/** `1:12` or `41 s`. */
export function duration(msDiff: number): string {
  const s = Math.max(0, Math.round(msDiff / 1000))
  if (s < 60) return tl('units.sec', { n: s })
  if (s < 600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  return min(Math.round(s / 60))
}

const PHASE: Record<TimelineKind, EmPhase> = {
  ALERT: 'verify', VERIFIED: 'verify', FALSE_ALARM: 'verify',
  ASKED: 'ask', ANSWERED: 'ask', NO_REPLY: 'ask',
  TRIAGED: 'triage',
  ALERTED: 'escalate', NOTIFIED: 'escalate', ACCEPTED: 'escalate', DECLINED: 'escalate', EXPIRED: 'escalate', NO_NEARBY: 'escalate',
  ARRIVED: 'escalate', CALLED_115: 'escalate',
  HANDOFF_SENT: 'handOff', HANDOFF_RECEIVED: 'handOff', HANDOFF_FAILED: 'handOff', FAMILY_UPDATE: 'handOff',
  AGENT_FALLBACK: 'agent', CLOSED: 'close', DISCHARGED: 'close',
}

const LEVEL: Record<NonNullable<IncidentDoc['level']>, EmLevel> = { OK: 'ok', MONITOR: 'monitor', COME_NOW: 'comeNow', EMERGENCY: 'emergency' }
const level = (l: EmLevel) => tl(`level.${l}`)

export function memberName(people: LivePeople, id: string): string {
  if (id === 'console') return tl('incident.who.console')
  return people.members[id]?.displayName ?? id.replace(/(^|-)(\w)/g, (_, d: string, c: string) => (d ? ' ' : '') + c.toUpperCase())
}

function actorLabel(people: LivePeople, actor: string): string {
  if (actor === 'SYSTEM') return tl('incident.who.system')
  if (actor === 'AGENT') return tl('incident.who.agent')
  if (actor === 'PERSON') return first(people.person?.displayName ?? tl('incident.who.person'))
  return memberName(people, actor)
}

const firstEntry = (tl: TimelineDoc[], kind: TimelineKind) => tl.find((e) => e.kind === kind)

function levelLabel(inc: IncidentDoc): string {
  if (inc.verify && !inc.verify.isReal) return level('falseAlarm')
  if (inc.status === 'ON_SCENE') return level('helpArrived')
  if (inc.status === 'CLOSED' && (inc.level === 'COME_NOW' || inc.level === 'EMERGENCY')) return level('closed')
  if (inc.level) return level(LEVEL[inc.level])
  return level(inc.status === 'CLOSED' ? 'closed' : 'checking')
}

function alertText(inc: IncidentDoc): string {
  const a = inc.alert
  const hr = a.hr !== undefined ? tl('incident.alert.hr', { hr: a.hr }) : tl('incident.alert.hrHigh')
  if (a.kind === 'FALL_IMPACT_NO_MOVEMENT') return a.movementMin ? tl('incident.alert.fallStill', { min: a.movementMin }) : tl('incident.alert.fall')
  if (a.kind === 'HR_HIGH_WITH_ACTIVITY') return tl('incident.alert.whileActive', { hr })
  return tl('incident.alert.notMoving', { hr })
}

function headline(inc: IncidentDoc, people: LivePeople, tz: string): { what: string; sub: string } {
  const turns = inc.checkIn?.turns ?? []
  const slurred = turns.some((t) => t.assessment?.clarity === 'SLURRED')
  const h = (k: string, o?: Record<string, unknown>) => tl(`incident.head.${k}`, o)
  if (inc.verify && !inc.verify.isReal) return { what: h('falseAlarm'), sub: inc.verify.reason }
  if (inc.status === 'VERIFYING') return { what: alertText(inc), sub: h('verifying') }
  if (inc.status === 'CHECKING_IN') {
    if (slurred) return { what: h('slurred'), sub: h('slurredSub') }
    if (inc.checkIn?.noReplyCount) return { what: h('noAnswer'), sub: h('noAnswerSub') }
    return { what: h('checking'), sub: h('checkingSub') }
  }
  if (inc.status === 'ON_SCENE' && inc.ownerId) {
    return { what: h('withHer', { name: first(memberName(people, inc.ownerId)) }), sub: inc.handoff ? h('hospital', { name: inc.handoff.hospitalName }) : h('helpWithHer') }
  }
  const reason = inc.triage?.reasons[0]
  const lkw = inc.lastKnownWellAt ? h('lastWell', { time: clockTime(inc.lastKnownWellAt, tz) }) : ''
  if (inc.status === 'CLOSED' && (inc.level === 'OK' || inc.level === 'MONITOR')) return { what: h('ok'), sub: reason ? reason[0].toUpperCase() + reason.slice(1) : '' }
  if (reason) return { what: reason[0].toUpperCase() + reason.slice(1), sub: lkw }
  return { what: alertText(inc), sub: lkw }
}

/** core-api's call queue: critical-alert members by priority, DISTANT ones only if ranked before the first NEARBY. */
function callQueue(people: LivePeople) {
  const circle = [...(people.person?.circle ?? [])].filter((c) => c.criticalAlerts).sort((a, b) => a.priority - b.priority)
  const firstNearby = Math.min(...circle.filter((c) => c.role === 'NEARBY').map((c) => c.priority))
  return circle.filter((c) => c.role === 'NEARBY' || c.priority < firstNearby)
}

/** Minutes left for the owner on the way, or null when unknown. */
function ownerEtaMin(inc: IncidentDoc, now: number): number | null {
  const a = (inc.assignments ?? []).find((x) => x.memberId === inc.ownerId)
  if (!inc.ownerId || a?.state === 'ARRIVED' || a?.etaMin === undefined) return null
  const since = Number.isFinite(ms(a.respondedAt)) ? (now - ms(a.respondedAt)) / 60000 : 0
  return Math.max(0, Math.round(a.etaMin - since))
}

function ownerView(inc: IncidentDoc, people: LivePeople, now: number, tz: string): LiveView['owner'] {
  const o = (k: string, opts?: Record<string, unknown>) => tl(`incident.owner.${k}`, opts)
  const self = first(people.person?.displayName ?? tl('incident.who.her'))
  if (inc.ownerId) {
    const name = first(memberName(people, inc.ownerId))
    const a = (inc.assignments ?? []).find((x) => x.memberId === inc.ownerId)
    if (a?.state === 'ARRIVED') {
      return { name, initials: initials(name), title: o('withSelf', { name, self }), subtitle: a.arrivedAt ? o('onSceneSince', { time: clockTime(a.arrivedAt, tz) }) : o('onScene'), eta: '✓' }
    }
    const left = ownerEtaMin(inc, now)
    return { name, initials: initials(name), title: o('onTheWay', { name }), subtitle: o('owns'), eta: left === null ? '—' : `${left}′` }
  }
  // The member being rung now: a NEARBY one, or a queued DISTANT one (only those get a deadline).
  const waiting = (inc.assignments ?? []).find((a) => a.state === 'NOTIFIED' && (a.role === 'NEARBY' || a.deadlineAt))
  if (waiting) {
    const name = first(memberName(people, waiting.memberId))
    const left = ms(waiting.deadlineAt) - now
    const secs = Math.max(0, Math.round(left / 1000))
    const eta = !Number.isFinite(left) ? '—' : secs < 60 ? `${secs}″` : duration(left)
    return { name, initials: initials(name), title: o('alerted', { name }), subtitle: o(waiting.role === 'NEARBY' ? 'waiting' : 'calling'), eta }
  }
  if (firstEntry(inc.timeline, 'NO_NEARBY')) return { name: '', initials: '!', title: o('noNearby'), subtitle: o(firstEntry(inc.timeline, 'CALLED_115') ? 'autoCalled' : 'callNow', { num: people.person?.emergencyNumber ?? '000' }), eta: '—' }
  const firstUp = callQueue(people)[0]
  const name = firstUp ? first(memberName(people, firstUp.memberId)) : tl('incident.who.circle')
  return { name, initials: initials(name), title: o('notYet', { name }), subtitle: o('firstToCall'), eta: '—' }
}

function slaRows(inc: IncidentDoc): LiveView['sla'] {
  const t0 = ms(inc.alert.at)
  const at = (k: TimelineKind) => ms(firstEntry(inc.timeline, k)?.at)
  const gap = (a: number, b: number) => (Number.isFinite(a) && Number.isFinite(b) ? duration(b - a) : null)
  const arrived = (inc.assignments ?? []).find((a) => a.arrivedAt)?.arrivedAt
  return [
    [tl('sla.verified'), gap(t0, at('VERIFIED'))],
    [tl('sla.escalated'), gap(at('VERIFIED'), at('NOTIFIED'))],
    [tl('sla.accepted'), gap(t0, at('ACCEPTED'))],
    [tl('sla.atDoor'), gap(t0, ms(arrived))],
    [tl('sla.edPacket'), inc.handoff?.status === 'RECEIVED' ? (inc.handoff.etaMin !== undefined ? tl('sla.minAhead', { n: inc.handoff.etaMin }) : tl('sla.yes')) : null],
  ]
}

/** The first DISTANT circle member with critical alerts (the voice that rings first), else the first DISTANT one. */
function callerOf(people: LivePeople): string | null {
  const distant = [...(people.person?.circle ?? [])].filter((c) => c.role === 'DISTANT').sort((a, b) => a.priority - b.priority)
  const c = distant.find((x) => x.criticalAlerts) ?? distant[0]
  return c ? first(memberName(people, c.memberId)) : null
}

function phoneView(inc: IncidentDoc, people: LivePeople, now: number, tz: string): LivePhone {
  const ph = (k: string, o?: Record<string, unknown>) => tl(`incident.phone.${k}`, o)
  const name = first(people.person?.displayName ?? '')
  const ci = inc.checkIn
  const base: LivePhone = {
    time: clockTime(now, tz), q: '', flash: false, yn: false, voice: false, busy: false, help: null, helperName: null, callerName: null,
    noReplySeconds: inc.demo.noReplySeconds, questionKey: null, audioPath: null, status: null,
  }
  if (inc.status === 'VERIFYING') return { ...base, q: `${name}…`, small: ph('ringing'), flash: true, callerName: callerOf(people) }
  if (inc.status === 'CHECKING_IN') {
    if (ci?.pending && !ci.busy) {
      const yn = ci.pending.kind === 'YES_NO' || ci.mode === 'LARGE_TEXT'
      return {
        ...base, q: ci.pending.text, yn, voice: !yn,
        questionKey: `${ci.turns.length}:${ci.noReplyCount}:${ci.pending.text}`, audioPath: ci.pending.audioPath ?? null,
      }
    }
    const last = [...(ci?.turns ?? [])].reverse().find((t) => t.by === 'AGENT')
    return { ...base, q: last?.text ?? `${name}…`, small: ci?.busy ? ph('listening') : undefined, busy: true }
  }
  if (inc.verify && !inc.verify.isReal) return { ...base, q: ph('fine') }
  if (inc.status === 'CLOSED' && (inc.level === 'OK' || inc.level === 'MONITOR')) return { ...base, q: ph('glad') }
  let help: string | null = null
  let helperName: string | null = null
  if (inc.ownerId) {
    const helper = first(memberName(people, inc.ownerId))
    helperName = helper
    const arrived = (inc.assignments ?? []).find((x) => x.memberId === inc.ownerId)?.state === 'ARRIVED'
    const left = ownerEtaMin(inc, now)
    help = inc.status === 'ON_SCENE' ? ph('withYou', { name: helper }) : ph('away', { name: helper, eta: left !== null ? min(left) : arrived ? '✓' : '—' })
  }
  const instr = inc.personInstruction
  return {
    ...base, q: instr?.text ?? ph('onTheWay'), help, helperName, audioPath: instr?.audioPath ?? null, questionKey: instr ? 'instruction' : null,
    status: instr ? helperStatus(inc, people) : null,
  }
}

const CLIPS = new Set(['calling-james', 'no-answer-james-calling-david', 'on-the-way-david'])
const clip = (name: string) => (CLIPS.has(name) ? `/noa/${name}.mp3` : null)

/** Margaret's status line from the latest escalation event; `key` names the status and the event it came from. */
export function helperStatus(inc: IncidentDoc, people: LivePeople): HelperStatus | null {
  const s = (k: string, o?: Record<string, unknown>) => tl(`incident.phone.status.${k}`, o)
  // SYSTEM events name the member by display name in the text; member events by `actor`.
  const idByName = (name: string) => Object.keys(people.members).find((id) => people.members[id].displayName === name) ?? name
  const memberOf = (e: TimelineDoc) =>
    e.kind === 'NOTIFIED' ? idByName(e.text.slice('Calling '.length).split(':')[0])
      : e.kind === 'EXPIRED' ? idByName(e.text.split(' did not answer')[0]) : e.actor
  const firstOf = (id: string) => first(memberName(people, id))
  const events = inc.timeline.filter((e) => ((e.kind === 'NOTIFIED' || e.kind === 'CALLED_115') && e.text.startsWith('Calling ')) || e.kind === 'EXPIRED'
    || e.kind === 'DECLINED' || e.kind === 'ACCEPTED' || e.kind === 'ARRIVED')
  const last = events[events.length - 1]
  if (!last) return null
  const status = (name: string, text: string): HelperStatus => ({ text, clip: clip(name), key: `${name} ${last.at}` })
  const num = people.person?.emergencyNumber ?? '115'
  if (last.kind === 'CALLED_115') {
    const accepted = [...events].reverse().find((e) => e.kind === 'ACCEPTED')
    if (!accepted) return status('calling-000', s('calling000', { num }))
    const x = firstOf(memberOf(accepted))
    return status(`on-the-way-${x.toLowerCase()}`, s('onTheWayCalling', { name: x, num }))
  }
  const x = firstOf(memberOf(last))
  if (last.kind === 'ACCEPTED') return status('on-the-way', s('onTheWay', { name: x }))
  if (last.kind !== 'NOTIFIED') return null
  const prev = events[events.length - 2]
  if (prev && (prev.kind === 'EXPIRED' || prev.kind === 'DECLINED')) {
    const p = firstOf(memberOf(prev))
    return status(`no-answer-${p.toLowerCase()}-calling-${x.toLowerCase()}`, s('noAnswer', { prev: p, name: x }))
  }
  return status(`calling-${x.toLowerCase()}`, s('calling', { name: x }))
}

/** Said on Margaret's phone once the 000 call has ended (LivePage owns when). */
export const ambulanceStatus = (incidentId: string): HelperStatus =>
  ({ text: tl('incident.phone.status.ambulance'), clip: '/noa/ambulance-coming.mp3', key: `ambulance-coming ${incidentId}` })

function orbitView(inc: IncidentDoc, now: number): EmOrbitTargets {
  const severe = inc.level === 'COME_NOW' || inc.level === 'EMERGENCY'
  const owner = (inc.assignments ?? []).find((a) => a.memberId === inc.ownerId)
  let app = 0
  if (owner?.state === 'ARRIVED') app = 1
  else if (owner?.etaMin && Number.isFinite(ms(owner.respondedAt))) app = Math.min(0.95, Math.max(0.05, (now - ms(owner.respondedAt)) / (owner.etaMin * 60000)))
  const distantNotified = (inc.assignments ?? []).some((a) => a.role === 'DISTANT' && a.state !== 'QUEUED')
  return {
    mode: severe ? 'sos' : 'check',
    app,
    call: firstEntry(inc.timeline, 'CALLED_115') ? 1 : distantNotified ? 0.35 : 0,
    hosp: inc.handoff?.status === 'RECEIVED' ? 1 : 0,
    arrived: inc.status === 'ON_SCENE' ? 1 : 0,
  }
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase())

/** `Suspected stroke` (the condition is the agent's own word, lower-cased). */
const suspectedText = (s: string) => tl('incident.packet.suspected', { what: s.toLowerCase() })
/** `ETA 11 min` or `ETA unknown`. */
const etaText = (eta: number | undefined) => tl('incident.packet.eta', { eta: eta !== undefined ? min(eta) : tl('incident.packet.unknown') })

/**
 * Pre-arrivals packet rows from hospital-agent's JSON (contract 4.4), in the prototype's row order. Tolerates a
 * partial packet (an agent stub or fallback): missing fields are skipped, and `text` is shown when nothing else is.
 */
export function packetRows(p: Partial<PacketDoc>, tz: string): LabelValue[] {
  const k = (key: string, o?: Record<string, unknown>) => tl(`incident.packet.${key}`, o)
  const rows: LabelValue[] = []
  const sex = p.patient?.sex === 'F' ? k('female') : p.patient?.sex === 'M' ? k('male') : p.patient?.sex
  if (p.patient) rows.push([k('patient'), `${p.patient.name}, ${p.patient.age} · ${sex}`])
  if (p.suspected) rows.push([k('status'), `${suspectedText(p.suspected)} · ${etaText(p.etaMin)}`])
  if (p.lastKnownWellAt) rows.push([k('lastWell'), clockTime(p.lastKnownWellAt, tz)])
  if (p.findings?.length) rows.push([k('findings'), p.findings.join(' · ')])
  if (p.conditions?.length) rows.push([k('history'), p.conditions.join(', ')])
  if (p.familyHistory?.length) rows.push([k('familyHistory'), p.familyHistory.join(' · ')])
  if (p.medications?.length) rows.push([k('medicines'), p.medications.map((m) => `${titleCase(m.name)} ${m.dose}`).join(', ')])
  if (p.allergies) rows.push([k('allergy'), p.allergies.length ? p.allergies.map(titleCase).join(', ') : k('noneKnown')])
  else if (p.warnings?.includes('ALLERGIES_NOT_RECORDED')) rows.push([k('allergy'), k('notRecorded')])
  if (p.baseline) rows.push([k('function'), p.baseline])
  if (p.communication?.length) rows.push([k('comms'), p.communication.map((c) => k(`comm.${c}`)).join(' · ')])
  if (p.contact) rows.push([p.contact.onScene ? k('onScene') : k('contact'), `${p.contact.name} (${p.contact.relation})`])
  if (p.withheld?.length) {
    const what = p.withheld.map((c) => k(`cat.${c}`)).join(', ')
    rows.push([k('withheld'), p.status === 'BLOCKED_CONSENT' ? `${k('noConsent')} · ${what}` : what])
  }
  if (rows.length === 0 && p.text) rows.push([k('packet'), p.text])
  return rows
}

/**
 * The member's own buttons: none for `QUEUED` (contract 2.3), after declining or once closed. The stored `actions`
 * are used as written, except where the action rules (contract 3) decide: the owner gets `ARRIVED` once accepted
 * (core-api leaves `ACCEPT`/`DECLINE` there), and nobody else is offered `ACCEPT`/`DECLINE` once someone owns the case.
 */
export function memberButtons(inc: IncidentDoc, people: LivePeople, memberId: string): MemberButtons | null {
  const a = (inc.assignments ?? []).find((x) => x.memberId === memberId)
  if (!a || a.state === 'QUEUED' || a.state === 'DECLINED' || inc.status === 'CLOSED') return null
  let actions: AssignmentAction[] = a.actions
  if (a.state === 'ARRIVED') actions = []
  else if (a.state === 'ACCEPTED' && inc.ownerId === memberId) actions = ['ARRIVED']
  else if (inc.ownerId) actions = actions.filter((x) => x !== 'ACCEPT' && x !== 'DECLINE')
  return { memberId, name: memberName(people, memberId), assignment: a, actions }
}

/** The orbit's hospital ball named after the hospital the handoff picked, once there is one. */
export function orbitWithHospital(scene: OrbitScene, hospitalName: string | undefined): OrbitScene {
  const name = hospitalName?.replace(/\s*\(demo\)$/, '')
  return name ? { ...scene, nodes: scene.nodes.map((n) => (n.id === 'hosp' ? { ...n, name } : n)) } : scene
}

/** Buttons that post to core-api; `CALL_PERSON` and `CALL_NEARBY` are client-only. */
export const isServerAction = (a: AssignmentAction): a is Exclude<ServerAction, 'CLOSE'> => a !== 'CALL_PERSON' && a !== 'CALL_NEARBY'

export function liveView(id: string, inc: IncidentDoc, people: LivePeople, now: number): LiveView {
  const tz = people.person?.timezone ?? 'Asia/Ho_Chi_Minh'
  const { what, sub } = headline(inc, people, tz)
  const owner = ownerView(inc, people, now, tz)
  const p = inc.handoff?.status === 'RECEIVED' ? inc.handoff.packet : undefined
  const eta = p?.etaMin ?? inc.handoff?.etaMin
  const lkw = p?.lastKnownWellAt ?? inc.lastKnownWellAt
  const name = people.person?.displayName ?? p?.patient?.name ?? tl('incident.who.patient')
  const age = people.person?.age ?? p?.patient?.age
  const idWithheld = p?.withheld?.includes('identity') ?? false
  const short = idWithheld ? tl('incident.packet.anonymous') : `${first(name)} ${name.split(' ')[1]?.[0] ? `${name.split(' ')[1][0]}.` : ''}`.trim() + (age ? `, ${age}` : '')
  const suspected = p?.suspected ? suspectedText(p.suspected) : tl('incident.packet.preArrival')
  return {
    id,
    open: inc.status !== 'CLOSED',
    levelLabel: levelLabel(inc),
    minutes: Math.max(0, Math.floor((now - ms(inc.alert.at)) / 60000)),
    storyTime: clockTime(now, tz),
    what,
    sub,
    owner,
    timeline: inc.timeline.map((e) => ({ kind: e.kind, t: clockTime(e.at, tz), ph: tl(`phase.${PHASE[e.kind]}`), d: e.text, s: actorLabel(people, e.actor) })),
    sla: slaRows(inc),
    phone: phoneView(inc, people, now, tz),
    orbit: orbitView(inc, now),
    callScript: inc.callScript ?? null,
    emergencyNumber: people.person?.emergencyNumber ?? '115',
    personName: name,
    packet: p
      ? {
          meta: short,
          summary: `${suspected} · ${etaText(eta)}`,
          rows: packetRows(p, tz),
          incoming: {
            eta: eta !== undefined ? min(eta) : '—',
            patient: tl('incident.packet.enrolled', { who: short }),
            presenting: `${suspected}${lkw ? ` · ${tl('incident.packet.lastWellAt', { time: clockTime(lkw, tz) })}` : ''}`,
          },
        }
      : null,
    pathwayStep: p ? (inc.status === 'CLOSED' ? 9 : inc.status === 'ON_SCENE' ? 8 : 7) : null,
  }
}
