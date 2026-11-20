import type { AgentId, FhIcon, Mode, NoaLang, PersonId, Profile, QsetId, RuleId, StageId, TestCaseId, Tone, Txt, TxtList, UrgencyId, VtId } from '../data/types'
import type { Flag, FamRow } from './flags'
import type { QItem, TestChoice } from './home'
import type { Pathway } from './pathway'
import type { PatternCard } from './pattern'
import type { SpeechResult } from './speech'
import type { QVals } from '../data/tests'

/**
 * The feed of one journey: typed items carrying data and text descriptors (`Txt`), never built English strings. `t` is the
 * simulated clock ("08:40") when the item was added. The UI renders only the items since the last `stage` item in the main
 * column, and all of them in "Everything so far".
 */
export type Source = 'live' | 'prepared' | 'guardrail' | 'fixed'
interface Base { id: number; t: string }
export interface PacketLine { label: Txt; value: Txt | TxtList | string | number }
export type FeedItem =
  | (Base & { kind: 'stage'; stage: StageId })
  | (Base & { kind: 'hand'; from: AgentId; to: AgentId; rule: RuleId; reason: Txt; packet: PacketLine[] })
  | (Base & {
    kind: 'agent'; agent: AgentId; mode: Mode; audience: Txt | null; typing: boolean
    /** Prepared and fixed text is a descriptor (re-translated with the app language); live text is the model's string in `lang`. */
    text: Txt | string | null; lang: NoaLang; source: Source | null; note: Txt | string | null; why: Txt | null
  })
  | (Base & { kind: 'sys'; icon: FhIcon; text: Txt })
  | (Base & { kind: 'me'; who: Txt; text: Txt | string; chip: Txt | null })
  | (Base & { kind: 'card'; card: Card; open: boolean; picked: Txt | null })
  | (Base & { kind: 'pattern'; person: PersonId; cards: PatternCard[] })
  | (Base & { kind: 'push'; to: Txt; text: Txt; why: Txt })
  | (Base & { kind: 'famw'; person: PersonId; rows: FamRow[] })
  | (Base & { kind: 'flags'; person: PersonId; flags: Flag[]; note: Txt | null })
  | (Base & { kind: 'vtplan'; person: PersonId; use: TestChoice[]; skip: TestChoice[] })
  | (Base & { kind: 'vtres'; person: PersonId; results: { test: VtId; txt: Txt; lvl: string }[] })
  | (Base & { kind: 'path'; person: PersonId; path: Pathway; note: Txt | null })
  | (Base & { kind: 'done'; text: Txt })
export type FeedKind = FeedItem['kind']

/** "Your turn" cards. `who` is the person answering ("Saeed", "Amna (parent decides for Hind)"). */
export interface ChoiceOption { id: string; label: Txt }
export type Card =
  | { type: 'protect'; id: number; who: Txt; genomic: boolean; gen: boolean; contacts: PersonId[]; sel: PersonId[] }
  | { type: 'speech'; id: number; who: Txt; retry: boolean; person: PersonId; result: SpeechResult | null }
  | { type: 'choice'; id: number; qid: string; who: Txt; q: Txt; opts: ChoiceOption[]; def: string; free: boolean }
  | { type: 'qset'; id: number; test: QsetId; who: Txt; items: QItem[]; vals: QVals }
  | { type: 'din'; id: number; who: Txt; rounds: { digits: string; noise: Txt }[]; answers: string[] }
  /** After Detect Noa waits: the person starts the check (`go`) or not (`later`). Nothing moves on by itself. */
  | { type: 'go'; id: number; who: Txt; urgent: boolean; msg: Txt; opts: ChoiceOption[]; def: 'go' }
export type CardType = Card['type']

/** The value `answer(cardId, value)` takes, per card type. */
export interface ProtectValue { genomic: boolean; contacts: PersonId[] }
export interface SpeechValue { said: string; secs: number | null; how: 'sample' | 'typed' | 'spoken' }
export type AnswerValue = string | ProtectValue | SpeechValue | QVals | string[]

export interface HandoffLog { from: AgentId; to: AgentId; rule: RuleId; reason: Txt; t: string }
export interface Status { label: Txt; tone: Tone }
export interface HeartPill { pct: string; cat: 'high' | 'moderate' | 'low'; tone: 'bad' | 'warn' | 'good' }
export interface Counters { live: number; prepared: number; guardrail: number; overruled: number }
/** Department of Health tiles (journeys, booked, "why?" answered, referrals, not now) plus two counted but not shown. */
export interface GovCounters { journeys: number; booked: number; barriers: number; referrals: number; notNow: number; emergencies: number; handoffs: number; refAccepted: number; refDeclined: number }
export interface Note { id: number; to: PersonId | 'noa' | 'me'; icon: FhIcon; text: Txt | string; t: string; read: boolean; /** 'live' when the AI worded it. */ source?: 'live' }

export interface JourneyView {
  person: PersonId
  stage: StageId | null
  seen: StageId[]
  /** 'em' after an emergency stop. */
  branch: 'em' | null
  done: Txt | null
  testCase: TestCaseId | null
  genomic: boolean
  share: PersonId[]
  urgent: RuleId | null
}

/**
 * The referral Courier sent when a journey reached the Referral step (Hospital > Referrals shows it first). Every text is a
 * descriptor (`Txt`) or a literal, so the page shows it in the current language; only a live AI note is the model's string.
 */
export interface FamilyReferral {
  /** `fh-<person>-<journey number>`: changes with every journey. */
  id: string
  person: PersonId
  /** "Saeed Al Nuaimi, 64". */
  title: Txt
  /** The person's clinic and doctor. */
  to: Txt
  /** "Noa · Courier, Specialist agent". */
  from: Txt
  /** The urgent signal, else the top flag, else "due by age and guideline". */
  why: Txt
  /** The pathway was accepted (Noa checked the next step, the urgency and the reason). */
  understood: boolean
  /** Population checks Noa booked. */
  booked: { name: Txt; where: Txt; when: Txt; u: UrgencyId }[]
  /** Clinical items only the doctor decides. */
  forDoctor: { text: Txt; u: UrgencyId; due: Txt }[]
  /** The speech check, if it ran. */
  speech: { score: number; lvl: SpeechResult['lvl']; matched: number; total: number; secs: number | null } | null
  /** Home tests and questionnaires (speech check first): name, result, level (`good` / `warn` / `bad`). */
  homeResults: { id: VtId; label: Txt; txt: Txt; lvl: string }[]
  /** Red-flag and symptom answers (and the child's questions) in plain words. */
  answers: { label: Txt; value: Txt }[]
  /** Visit preference, chosen time, language. */
  preferences: Txt
  /** Who sees the pathway and whether genomic data was used. */
  consent: Txt
  share: PersonId[]
  genomic: boolean
  /** What Noa suggests: the slot. */
  slot: Txt
  /** The Courier note as shown in the feed (live AI string or prepared descriptor) and where it came from. */
  note: { text: Txt | string; source: Source; lang: NoaLang }
  /** The journey clock when the referral was sent ("09:25"). */
  createdAt: string
  /** The doctor's decision in Hospital > Referrals (once), or null while it waits. */
  decision: ReferralDecision | null
}

/** Why the doctor declined a referral: another specialist, already seen recently, more tests first, or a free-text reason. */
export type RefReason = 'specialist' | 'seen' | 'tests' | 'other'

export interface ReferralDecision {
  outcome: 'accepted' | 'declined'
  /** Declined only. */
  reason?: RefReason
  /** The doctor's own words (reason `other`). */
  note?: string
  /** The doctor who decided ("Dr Omar Haddad"). */
  by: Txt
  /** The clock when it was decided ("09:40"). */
  at: string
}

export interface Snapshot {
  version: number
  /** "Noa speaks" language: the agents' words, the speech sentence and samples. */
  lang: NoaLang
  /** Simulated clock (ms, UTC arithmetic) and its "08:40". */
  clock: number
  time: string
  journey: JourneyView | null
  feed: FeedItem[]
  /** The open "Your turn" card, if any (the same object as in its feed item). */
  pending: Card | null
  canNext: boolean
  /** A journey is running and not waiting for an answer. */
  busy: boolean
  /** Emergency branch: the UI turns on `body.night`, the red ring and the alert bar. */
  emergency: boolean
  /** The skill holding the case (orchestra highlight). */
  active: AgentId | null
  hand: HandoffLog[]
  /** Rules used in this journey, in the order first applied, with how often. */
  rulesHit: { rule: RuleId; count: number }[]
  calls: Counters
  gov: GovCounters
  status: Record<PersonId, Status>
  heart: Record<PersonId, HeartPill | null>
  profiles: Record<PersonId, Profile>
  /** Family notifications: kept apart from the journey (Reset and new journeys keep them). Newest first. */
  notes: Note[]
  unread: number
  /** The AI port is answering (the typing dots read "thinking…"). */
  thinking: boolean
  /** The AI port: `none` (prepared text only, no live port plugged in), `live` (a live port, switched on) or `off` (switched off). */
  ai: 'none' | 'live' | 'off'
  /** The referral of the last journey that reached the Referral step (none after an emergency, "not now", Reset or a new journey). */
  referral: FamilyReferral | null
}
