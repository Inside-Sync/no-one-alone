/**
 * Shapes from `docs/contract.md` (v1.4): the Firestore documents the web reads and the core-api routes it calls.
 * Change docs/contract.md first, then this file. Optional fields are omitted, never null (except `ownerId`).
 */

export interface LatLng { lat: number; lng: number }

/* ---------- 2.1 people/{personId} ---------- */

export type CircleRole = 'NEARBY' | 'DISTANT'

export interface CircleEntryDoc {
  memberId: string
  relation: string
  role: CircleRole
  priority: number
  criticalAlerts?: boolean
}

/** The older person (has `circle`) or a Health Circle member (only the first four fields). */
export interface PersonDoc {
  displayName: string
  timezone?: string
  locale?: string
  location?: LatLng
  age?: number
  sex?: 'F' | 'M'
  dialect?: 'HUE' | 'SOUTH' | 'STANDARD'
  emergencyNumber?: string
  addressText?: string
  accessibility?: { hearing: 'NORMAL' | 'LOSS' }
  baseline?: { restingHr: number; nightHr: number }
  circle?: CircleEntryDoc[]
}

/* ---------- 2.2 hospitals/{hospitalId} ---------- */

export interface HospitalDoc {
  name: string
  location: LatLng
  strokeReady: boolean
}

/* ---------- 2.3 incidents/{incidentId} ---------- */

export type Scenario = 'STROKE' | 'FALL' | 'FALSE_ALARM'
export type IncidentStatus = 'VERIFYING' | 'CHECKING_IN' | 'ESCALATING' | 'ON_SCENE' | 'CLOSED'
export type Level = 'OK' | 'MONITOR' | 'COME_NOW' | 'EMERGENCY'
export type AlertKind = 'HR_HIGH_NO_MOVEMENT' | 'FALL_IMPACT_NO_MOVEMENT' | 'HR_HIGH_WITH_ACTIVITY'
export type AssignmentState = 'QUEUED' | 'NOTIFIED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'ARRIVED'
/** `CALL_PERSON` and `CALL_NEARBY` are client-only call buttons; the rest post to core-api. */
export type AssignmentAction = 'ACCEPT' | 'DECLINE' | 'ARRIVED' | 'CALLED_115' | 'CALL_PERSON' | 'CALL_NEARBY'
export type ServerAction = 'ACCEPT' | 'DECLINE' | 'ARRIVED' | 'CALLED_115' | 'CLOSE'
export type TimelineKind =
  | 'ALERT' | 'ALERTED' | 'VERIFIED' | 'FALSE_ALARM' | 'ASKED' | 'ANSWERED' | 'NO_REPLY' | 'TRIAGED' | 'NOTIFIED' | 'ACCEPTED'
  | 'DECLINED' | 'EXPIRED' | 'NO_NEARBY' | 'ARRIVED' | 'CALLED_115' | 'HANDOFF_SENT' | 'HANDOFF_RECEIVED'
  | 'HANDOFF_FAILED' | 'FAMILY_UPDATE' | 'AGENT_FALLBACK' | 'CLOSED' | 'DISCHARGED'

export interface Assessment {
  clarity: 'CLEAR' | 'SLURRED' | 'NO_SPEECH'
  coherent?: boolean
  symptoms?: string[]
  confidence?: number
}

export interface TurnDoc {
  by: 'AGENT' | 'PERSON'
  at: string
  text: string
  audioPath?: string
  assessment?: Assessment
}

export interface PendingDoc {
  text: string
  kind: 'VOICE' | 'YES_NO'
  audioPath?: string
}

export interface AssignmentDoc {
  memberId: string
  role: CircleRole
  message?: string
  actions: AssignmentAction[]
  etaMin?: number
  state: AssignmentState
  attempt?: number
  notifiedAt?: string
  deadlineAt?: string
  respondedAt?: string
  arrivedAt?: string
}

export interface TimelineDoc {
  at: string
  /** `SYSTEM` | `AGENT` | `PERSON` | a memberId. */
  actor: string
  kind: TimelineKind
  text: string
}

/** 4.4: categories hospital-agent can withhold from a packet. */
export type PacketCategory = 'identity' | 'conditions' | 'medications' | 'allergies' | 'familyHistory' | 'communication'

/**
 * 4.4: what hospital-agent returns and core-api stores as `handoff.packet`. Fields it withholds are absent: an absent
 * `allergies` means unknown, `[]` means recorded no known allergy. `status` is the packet's preparation status.
 */
export interface PacketDoc {
  status: 'COMPLETED' | 'PARTIAL' | 'BLOCKED_CONSENT'
  patient?: { name: string; age: number; sex: string }
  suspected: string
  lastKnownWellAt?: string
  findings: string[]
  conditions?: string[]
  familyHistory?: string[]
  medications?: { name: string; dose: string }[]
  allergies?: string[]
  communication?: ('HARD_OF_HEARING' | 'COGNITIVE_IMPAIRMENT')[]
  baseline?: string
  contact?: { name: string; relation: string; onScene: boolean }
  etaMin?: number
  text: string
  withheld?: PacketCategory[]
  warnings?: string[]
  /** Typed only, not displayed. */
  sources?: string[]
}

export interface HandoffDoc {
  hospitalId: string
  hospitalName: string
  etaMin?: number
  status: 'PENDING' | 'RECEIVED' | 'FAILED'
  sentAt?: string
  packet?: PacketDoc
}

export interface DemoParams {
  timerSeconds: number
  noReplySeconds: number
  clockOffsetMs: number
}

export interface IncidentDoc {
  personId: string
  scenario: Scenario
  status: IncidentStatus
  level?: Level
  version: number
  createdAt: string
  updatedAt: string
  alert: { kind: AlertKind; at: string; hr?: number; movementMin?: number }
  lastKnownWellAt?: string
  verify?: { isReal: boolean; reason: string; fallback: boolean }
  checkIn?: {
    mode: 'VOICE' | 'LARGE_TEXT'
    noReplyCount: number
    busy: boolean
    done: boolean
    pending?: PendingDoc
    turns: TurnDoc[]
  }
  triage?: { reasons: string[]; fallback: boolean }
  personInstruction?: { scriptIds: string[]; text: string; audioPath?: string }
  recovery?: RecoveryDoc
  assignments?: AssignmentDoc[]
  ownerId: string | null
  callScript?: string
  handoff?: HandoffDoc
  timeline: TimelineDoc[]
  demo: DemoParams
}

/* ---------- 2.4 forecasts/{personId} ---------- */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface SeriesPoint {
  date: string
  systolic?: number
  systolicForecast?: number
  lower?: number
  upper?: number
}

export interface ForecastDoc {
  asOf: string
  storyDay: number
  method: string
  risks: { condition: string; horizonDays: number; level: RiskLevel }[]
  drivers: string[]
  action?: { text: string; ownerMemberId?: string }
  series: SeriesPoint[]
}

/* ---------- 2.5 families/{personId} ---------- */

export interface FamilyMemberDoc {
  id: string
  name: string
  relation: string
  generation: number
  deceased?: boolean
  parentId?: string
  conditions: { label: string; ageAtOnset?: number }[]
}

export interface FamilyDoc {
  members: FamilyMemberDoc[]
  flags: { memberId: string; screening: string; reason: string; explanation?: string }[]
}

/* ---------- 2.6 demo/current ---------- */

export interface DemoCurrentDoc {
  incidentId: string
  scenario: Scenario
  personId: string
  startedAt: string
}

/* ---------- 4.1 core-api ---------- */

export type DemoScenario = 'stroke' | 'fall' | 'false-alarm'

export type CheckinInput = { audio: Blob } | { yesNo: 'YES' | 'NO' } | { noReply: true }

export type ApiErrorCode = 'INVALID_REQUEST' | 'UNAUTHENTICATED' | 'NOT_FOUND' | 'ALREADY_OWNED' | 'INVALID_STATE' | 'AGENT_FAILED'

export type MedChange = 'New' | 'Increased' | 'Continue' | 'Stop'

/** Contract 4.1 `POST /api/incidents/{id}/recovery` body; a med without `change` is Continue. */
export interface RecoveryRequest {
  staffName: string
  diagnosis: string
  meds: { name: string; dose: string; times: string[]; change?: MedChange }[]
  /** `reminder`: what Noa says at each time, as written; else core-api's template. */
  activities: { text: string; times: string[]; reminder?: string }[]
  followUps: { text: string; inDays: number }[]
  notes: string
}

/** Contract 2.3 `incidents/{id}.recovery`. */
export interface RecoveryDoc extends RecoveryRequest {
  createdAt: string
  followUps: { text: string; inDays: number; date: string }[]
  summary: string
  summaryAudioPath?: string
  reminders: { time: string; kind: 'MED' | 'ACTIVITY'; text: string; audioPath?: string }[]
  fallback: boolean
}
