/**
 * Timeline entries (contract 2.3 `timeline[]`): which circle member an entry is about, which entries are calls, and the
 * line to show for one in the language in use.
 *
 * core-api writes `kind`, and since the bilingual change `memberId` and `params` next to the English `text`. Every
 * reader here uses those codes first and the English wording only for an entry that has neither (an older document).
 */
import i18n from '@/i18n'
import type { TimelineDoc } from '@/data/contract'

/** What these helpers read of an entry; `actor`, `memberId` and `params` are optional so older documents and fixtures fit. */
export interface TimelineLike {
  at: string
  kind: string
  text: string
  actor?: string
  memberId?: TimelineDoc['memberId']
  params?: TimelineDoc['params']
}

/** True when core-api wrote the codes for this entry. */
const coded = (e: TimelineLike) => e.memberId !== undefined || e.params !== undefined

/** `NOTIFIED`: core-api is calling a circle member ("Calling X: ..."). */
export const isMemberCall = (e: TimelineLike): boolean => e.kind === 'NOTIFIED' && (e.memberId !== undefined || e.text.startsWith('Calling '))

/** `CALLED_115` that Noa placed herself ("Calling 998 automatically ..."), not one a member reported ("X called 998"). */
export const isAutoCall = (e: TimelineLike): boolean =>
  e.kind === 'CALLED_115' && (coded(e) ? e.memberId === undefined : e.text.startsWith('Calling '))

/** An entry that makes the phone ring: a call to a member or Noa's own call to the emergency number. */
export const isCallEntry = (e: TimelineLike): boolean => isMemberCall(e) || isAutoCall(e)

/** The circle member an entry is about: `memberId`, else the name in the wording ("Calling X", "X did not answer"), else the actor. */
export function entryMember(e: TimelineLike, idByName: (name: string) => string): string | undefined {
  if (e.memberId !== undefined) return e.memberId
  if (e.kind === 'NOTIFIED' && e.text.startsWith('Calling ')) return idByName(e.text.slice('Calling '.length).split(':')[0])
  if (e.kind === 'EXPIRED' && e.text.includes(' did not answer')) return idByName(e.text.split(' did not answer')[0])
  return e.actor
}

/** Who and what a line can name, from the app's own data. */
export interface LineContext {
  /** A member's name for display. */
  name: (memberId: string) => string
  /** The hospital the handoff chose, as `{ id, name }`. */
  hospital?: { id: string; name: string }
}

const tl = (key: string, opts?: Record<string, unknown>): string => (i18n.t as (k: string, o?: object) => string)(`live:line.${key}`, opts)

const FALLBACK_STEPS = ['VERIFY', 'CHECKIN', 'TRIAGE', 'PLAN', 'HANDOFF']
const LEVELS = ['OK', 'MONITOR', 'COME_NOW', 'EMERGENCY']

/**
 * The line for one entry in the language in use, built from `kind`, `memberId` and `params`. Entries whose text is
 * written by the agent in the person's language (questions, answers she spoke, the verify reason, messages to family and
 * hospital) and entries without the codes a line needs keep core-api's `text`.
 */
export function timelineText(e: TimelineLike, ctx: LineContext): string {
  const p = e.params
  const who = e.memberId !== undefined ? ctx.name(e.memberId) : undefined
  switch (e.kind) {
    case 'ALERT':
      if (p?.hr !== undefined && p.movementMin !== undefined) return tl('ALERT', { hr: p.hr, min: p.movementMin })
      break
    case 'AGENT_FALLBACK':
      if (p?.step && FALLBACK_STEPS.includes(p.step)) return tl(`fallback.${p.step}`)
      break
    case 'ANSWERED':
      if (p?.answer) return tl(`answered.${p.answer}`)
      if (p?.noSpeech) return tl('answered.noSpeech')
      break
    case 'NO_REPLY':
      if (p) return tl('NO_REPLY')
      break
    case 'TRIAGED':
      if (p?.level && LEVELS.includes(p.level) && p.reasons) return tl('TRIAGED', { level: tl(`level.${p.level}`), reasons: p.reasons.join(tl('sep')) })
      break
    case 'ALERTED':
      if (p?.memberIds) return tl(p.suspectedStroke ? 'ALERTED_STROKE' : 'ALERTED', { names: p.memberIds.map(ctx.name).join(tl('sep')) })
      break
    case 'NOTIFIED':
      if (who !== undefined) return p?.etaMin !== undefined ? tl('NOTIFIED_ETA', { name: who, eta: p.etaMin }) : tl('NOTIFIED', { name: who })
      break
    case 'EXPIRED':
      if (who !== undefined && p?.seconds !== undefined) return tl(p.voicemail ? 'EXPIRED_VOICEMAIL' : 'EXPIRED', { name: who, seconds: p.seconds })
      break
    case 'ACCEPTED':
    case 'DECLINED':
    case 'ARRIVED':
      if (who !== undefined) return tl(e.kind, { name: who })
      break
    case 'NO_NEARBY':
      return tl('NO_NEARBY')
    case 'CALLED_115':
      if (p?.number !== undefined) return who !== undefined ? tl('CALLED_115_MEMBER', { name: who, number: p.number }) : tl('CALLED_115_AUTO', { number: p.number })
      break
    case 'HANDOFF_RECEIVED':
      if (p?.hospitalId !== undefined) return tl('HANDOFF_RECEIVED')
      break
    case 'HANDOFF_FAILED':
      if (p?.hospitalId !== undefined && ctx.hospital?.id === p.hospitalId) return tl('HANDOFF_FAILED', { hospital: ctx.hospital.name })
      break
    case 'CLOSED':
      if (p?.by) return tl(`closed.${p.by}`)
      break
    case 'DISCHARGED':
      if (p?.staffName) return tl('DISCHARGED', { name: p.staffName })
      break
  }
  return e.text
}
