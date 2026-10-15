/**
 * The live emergency (VITE_DATA_SOURCE=firebase): what the Live and Pre-arrivals pages show for one incident
 * document (contract 2.3). Pure; no React, no clock: `now` is story time (`Date.now() + demo.clockOffsetMs`, see
 * lib/clock), so every countdown compares story time with story time.
 */
import type {
  AssignmentAction, AssignmentDoc, IncidentDoc, PacketDoc, PersonDoc, ServerAction, TimelineDoc, TimelineKind,
} from '@/data/contract'
import type { LabelValue } from '@/data/types'
import type { EmOrbitTargets } from './emergency'

/** Seed people the view names members from (the subject plus their circle). */
export interface LivePeople {
  person: PersonDoc | null
  members: Record<string, PersonDoc>
}

export interface LiveTimelineRow {
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
  /** Seconds before the screen posts `noReply` while a question waits (`demo.noReplySeconds`). */
  noReplySeconds: number
  /** Changes whenever a new question is shown: the no-reply timer and the autoplay key off it. */
  questionKey: string | null
  /** Audio to autoplay: the pending question or the instruction (contract 2.6). */
  audioPath: string | null
}

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
  owner: { initials: string; title: string; subtitle: string; eta: string }
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

/** `1:12` or `41 s`. */
export function duration(msDiff: number): string {
  const s = Math.max(0, Math.round(msDiff / 1000))
  if (s < 60) return `${s} s`
  if (s < 600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  return `${Math.round(s / 60)} min`
}

const PHASE: Record<TimelineKind, string> = {
  ALERT: 'Verify', VERIFIED: 'Verify', FALSE_ALARM: 'Verify',
  ASKED: 'Ask', ANSWERED: 'Ask', NO_REPLY: 'Ask',
  TRIAGED: 'Triage',
  NOTIFIED: 'Escalate', ACCEPTED: 'Escalate', DECLINED: 'Escalate', EXPIRED: 'Escalate', NO_NEARBY: 'Escalate',
  ARRIVED: 'Escalate', CALLED_115: 'Escalate',
  HANDOFF_SENT: 'Hand off', HANDOFF_RECEIVED: 'Hand off', HANDOFF_FAILED: 'Hand off',
  AGENT_FALLBACK: 'Agent', CLOSED: 'Close',
}

const LEVEL_LABEL = { OK: 'All OK', MONITOR: 'Keep an eye', COME_NOW: 'Come now', EMERGENCY: 'Emergency now' } as const

export function memberName(people: LivePeople, id: string): string {
  if (id === 'console') return 'Console'
  return people.members[id]?.displayName ?? id.replace(/(^|-)(\w)/g, (_, d: string, c: string) => (d ? ' ' : '') + c.toUpperCase())
}

function actorLabel(people: LivePeople, actor: string): string {
  if (actor === 'SYSTEM') return 'System'
  if (actor === 'AGENT') return 'Agent'
  if (actor === 'PERSON') return first(people.person?.displayName ?? 'Person')
  return memberName(people, actor)
}

const firstEntry = (tl: TimelineDoc[], kind: TimelineKind) => tl.find((e) => e.kind === kind)

function levelLabel(inc: IncidentDoc): string {
  if (inc.verify && !inc.verify.isReal) return 'False alarm'
  if (inc.status === 'ON_SCENE') return 'Help arrived'
  if (inc.status === 'CLOSED' && (inc.level === 'COME_NOW' || inc.level === 'EMERGENCY')) return 'Closed'
  if (inc.level) return LEVEL_LABEL[inc.level]
  return inc.status === 'CLOSED' ? 'Closed' : 'Checking'
}

function alertText(inc: IncidentDoc): string {
  const a = inc.alert
  const hr = a.hr !== undefined ? `Heart rate ${a.hr}` : ''
  if (a.kind === 'FALL_IMPACT_NO_MOVEMENT') return `Possible fall${a.movementMin ? `, not moving for ${a.movementMin} min` : ''}`
  if (a.kind === 'HR_HIGH_WITH_ACTIVITY') return `${hr || 'High heart rate'} while active`
  return `${hr || 'High heart rate'}, not moving`
}

function headline(inc: IncidentDoc, people: LivePeople, tz: string): { what: string; sub: string } {
  const turns = inc.checkIn?.turns ?? []
  const slurred = turns.some((t) => t.assessment?.clarity === 'SLURRED')
  if (inc.verify && !inc.verify.isReal) return { what: 'False alarm', sub: inc.verify.reason }
  if (inc.status === 'VERIFYING') return { what: alertText(inc), sub: 'The agent is checking before waking anyone' }
  if (inc.status === 'CHECKING_IN') {
    if (slurred) return { what: 'Slurred speech', sub: 'Possible stroke sign' }
    if (inc.checkIn?.noReplyCount) return { what: 'No answer yet', sub: 'Large text and yes/no on her screen now' }
    return { what: 'Checking in with her', sub: 'The agent is talking with her now' }
  }
  if (inc.status === 'ON_SCENE' && inc.ownerId) {
    return { what: `${first(memberName(people, inc.ownerId))} is with her`, sub: inc.handoff ? `Hospital: ${inc.handoff.hospitalName}` : 'Help is with her' }
  }
  const reason = inc.triage?.reasons[0]
  const lkw = inc.lastKnownWellAt ? `Last known well ${clockTime(inc.lastKnownWellAt, tz)}` : ''
  if (inc.status === 'CLOSED' && (inc.level === 'OK' || inc.level === 'MONITOR')) return { what: 'She is OK', sub: reason ? reason[0].toUpperCase() + reason.slice(1) : '' }
  if (reason) return { what: reason[0].toUpperCase() + reason.slice(1), sub: lkw }
  return { what: alertText(inc), sub: lkw }
}

const nearby = (inc: IncidentDoc) => (inc.assignments ?? []).filter((a) => a.role === 'NEARBY')

function ownerView(inc: IncidentDoc, people: LivePeople, now: number, tz: string): LiveView['owner'] {
  const self = first(people.person?.displayName ?? 'her')
  if (inc.ownerId) {
    const name = first(memberName(people, inc.ownerId))
    const a = (inc.assignments ?? []).find((x) => x.memberId === inc.ownerId)
    if (a?.state === 'ARRIVED') {
      return { initials: initials(name), title: `${name} · with ${self}`, subtitle: a.arrivedAt ? `On scene since ${clockTime(a.arrivedAt, tz)}` : 'On scene', eta: '✓' }
    }
    let eta = '—'
    if (a?.etaMin !== undefined) {
      const since = Number.isFinite(ms(a.respondedAt)) ? (now - ms(a.respondedAt)) / 60000 : 0
      eta = `${Math.max(0, Math.round(a.etaMin - since))}′`
    }
    return { initials: initials(name), title: `${name} · on the way`, subtitle: 'Owns the case', eta }
  }
  const waiting = nearby(inc).find((a) => a.state === 'NOTIFIED')
  if (waiting) {
    const name = first(memberName(people, waiting.memberId))
    const left = ms(waiting.deadlineAt) - now
    const eta = Number.isFinite(left) ? duration(left).replace(/ s$/, '″') : '—'
    return { initials: initials(name), title: `${name} · alerted`, subtitle: 'Waiting for them to accept', eta }
  }
  if (firstEntry(inc.timeline, 'NO_NEARBY')) return { initials: '!', title: 'No one nearby can come', subtitle: `Call ${people.person?.emergencyNumber ?? '000'} now`, eta: '—' }
  const firstUp = [...(people.person?.circle ?? [])].sort((a, b) => a.priority - b.priority).find((c) => c.role === 'NEARBY')
  const name = firstUp ? first(memberName(people, firstUp.memberId)) : 'Circle'
  return { initials: initials(name), title: `${name} · not yet alerted`, subtitle: 'First to call', eta: '—' }
}

function slaRows(inc: IncidentDoc): LiveView['sla'] {
  const t0 = ms(inc.alert.at)
  const at = (k: TimelineKind) => ms(firstEntry(inc.timeline, k)?.at)
  const gap = (a: number, b: number) => (Number.isFinite(a) && Number.isFinite(b) ? duration(b - a) : null)
  const arrived = (inc.assignments ?? []).find((a) => a.arrivedAt)?.arrivedAt
  return [
    ['Alert → verified', gap(t0, at('VERIFIED'))],
    ['Verified → escalated', gap(at('VERIFIED'), at('NOTIFIED'))],
    ['Accepted', gap(t0, at('ACCEPTED'))],
    ['At the door', gap(t0, ms(arrived))],
    ['ED has the packet', inc.handoff?.status === 'RECEIVED' ? (inc.handoff.etaMin !== undefined ? `${inc.handoff.etaMin} min ahead` : 'Yes') : null],
  ]
}

function phoneView(inc: IncidentDoc, people: LivePeople, owner: LiveView['owner'], now: number, tz: string): LivePhone {
  const name = first(people.person?.displayName ?? '')
  const ci = inc.checkIn
  const base: LivePhone = {
    time: clockTime(now, tz), q: '', flash: false, yn: false, voice: false, busy: false, help: null,
    noReplySeconds: inc.demo.noReplySeconds, questionKey: null, audioPath: null,
  }
  if (inc.status === 'VERIFYING') return { ...base, q: `${name}…`, small: 'Phone rings, screen flashes', flash: true }
  if (inc.status === 'CHECKING_IN') {
    if (ci?.pending && !ci.busy) {
      const yn = ci.pending.kind === 'YES_NO' || ci.mode === 'LARGE_TEXT'
      return {
        ...base, q: ci.pending.text, yn, voice: !yn,
        questionKey: `${ci.turns.length}:${ci.noReplyCount}:${ci.pending.text}`, audioPath: ci.pending.audioPath ?? null,
      }
    }
    const last = [...(ci?.turns ?? [])].reverse().find((t) => t.by === 'AGENT')
    return { ...base, q: last?.text ?? `${name}…`, small: ci?.busy ? 'Listening…' : undefined, busy: true }
  }
  if (inc.verify && !inc.verify.isReal) return { ...base, q: 'All fine. Sorry to bother you.' }
  if (inc.status === 'CLOSED' && (inc.level === 'OK' || inc.level === 'MONITOR')) return { ...base, q: 'Thank you. Glad you are OK.' }
  const help = inc.ownerId
    ? inc.status === 'ON_SCENE' ? `${first(memberName(people, inc.ownerId))} is with you` : `${first(memberName(people, inc.ownerId))} · ${owner.eta.replace('′', ' min')} away`
    : null
  const instr = inc.personInstruction
  return { ...base, q: instr?.text ?? 'Help is on the way.', help, audioPath: instr?.audioPath ?? null, questionKey: instr ? 'instruction' : null }
}

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

const COMMS: Record<PacketDoc['communication'][number], string> = {
  HARD_OF_HEARING: 'Hard of hearing: write questions down',
  COGNITIVE_IMPAIRMENT: 'Cognitive impairment: keep questions simple',
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase())

/**
 * Pre-arrivals packet rows from hospital-agent's JSON (contract 4.4), in the prototype's row order. Tolerates a
 * partial packet (an agent stub or fallback): missing fields are skipped, and `text` is shown when nothing else is.
 */
export function packetRows(p: Partial<PacketDoc>, tz: string): LabelValue[] {
  const rows: LabelValue[] = []
  if (p.patient) rows.push(['Patient', `${p.patient.name}, ${p.patient.age} · ${p.patient.sex === 'F' ? 'Female' : p.patient.sex === 'M' ? 'Male' : p.patient.sex}`])
  if (p.suspected) rows.push(['Status', `Suspected ${p.suspected.toLowerCase()} · ETA ${p.etaMin !== undefined ? `${p.etaMin} min` : 'unknown'}`])
  if (p.lastKnownWellAt) rows.push(['Last well', clockTime(p.lastKnownWellAt, tz)])
  if (p.findings?.length) rows.push(['Findings', p.findings.join(' · ')])
  if (p.conditions?.length) rows.push(['History', p.conditions.join(', ')])
  if (p.medications?.length) rows.push(['Medicines', p.medications.map((m) => `${titleCase(m.name)} ${m.dose}`).join(', ')])
  if (p.allergies) rows.push(['Allergy', p.allergies.length ? p.allergies.map(titleCase).join(', ') : 'None known'])
  if (p.baseline) rows.push(['Function', p.baseline])
  if (p.communication?.length) rows.push(['Comms', p.communication.map((c) => COMMS[c]).join(' · ')])
  if (p.contact) rows.push([p.contact.onScene ? 'On scene' : 'Contact', `${p.contact.name} (${p.contact.relation})`])
  if (rows.length === 0 && p.text) rows.push(['Packet', p.text])
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

/** Buttons that post to core-api; `CALL_PERSON` and `CALL_NEARBY` are client-only. */
export const isServerAction = (a: AssignmentAction): a is Exclude<ServerAction, 'CLOSE'> => a !== 'CALL_PERSON' && a !== 'CALL_NEARBY'

export function liveView(id: string, inc: IncidentDoc, people: LivePeople, now: number): LiveView {
  const tz = people.person?.timezone ?? 'Asia/Ho_Chi_Minh'
  const { what, sub } = headline(inc, people, tz)
  const owner = ownerView(inc, people, now, tz)
  const p = inc.handoff?.status === 'RECEIVED' ? inc.handoff.packet : undefined
  const eta = p?.etaMin ?? inc.handoff?.etaMin
  const lkw = p?.lastKnownWellAt ?? inc.lastKnownWellAt
  const name = people.person?.displayName ?? p?.patient?.name ?? 'Patient'
  const age = people.person?.age ?? p?.patient?.age
  const short = `${first(name)} ${name.split(' ')[1]?.[0] ? `${name.split(' ')[1][0]}.` : ''}`.trim() + (age ? `, ${age}` : '')
  const suspected = p?.suspected ? `Suspected ${p.suspected.toLowerCase()}` : 'Pre-arrival'
  return {
    id,
    open: inc.status !== 'CLOSED',
    levelLabel: levelLabel(inc),
    minutes: Math.max(0, Math.floor((now - ms(inc.alert.at)) / 60000)),
    storyTime: clockTime(now, tz),
    what,
    sub,
    owner,
    timeline: inc.timeline.map((e) => ({ t: clockTime(e.at, tz), ph: PHASE[e.kind], d: e.text, s: actorLabel(people, e.actor) })),
    sla: slaRows(inc),
    phone: phoneView(inc, people, owner, now, tz),
    orbit: orbitView(inc, now),
    callScript: inc.callScript ?? null,
    emergencyNumber: people.person?.emergencyNumber ?? '115',
    personName: name,
    packet: p
      ? {
          meta: short,
          summary: `${suspected} · ETA ${eta !== undefined ? `${eta} min` : 'unknown'}`,
          rows: packetRows(p, tz),
          incoming: { eta: eta !== undefined ? `${eta} min` : '—', patient: `${short} · enrolled`, presenting: `${suspected}${lkw ? ` · last well ${clockTime(lkw, tz)}` : ''}` },
        }
      : null,
    pathwayStep: p ? (inc.status === 'CLOSED' ? 9 : inc.status === 'ON_SCENE' ? 8 : 7) : null,
  }
}
