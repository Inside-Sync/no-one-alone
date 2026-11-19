import type { AgentId, DomainId, NoaLang, RuleId } from '../data/types'

/**
 * The AI port of the family-health journey. The journey is deterministic (prepared text, keyword reader); every place where an
 * agent speaks or a free-text reply is read goes through this interface, so the AI team can plug its model in with one class.
 *
 * Contract (see the call sites in `journey.ts`, each documents its `facts` and `task`):
 * - `say` writes one agent turn. It must return `fallback` (source `prepared`) when it cannot do better, and must never diagnose,
 *   name a medicine dose, discourage emergency care, or decide treatment. The engine re-checks live text with `guard()` and swaps in
 *   the prepared text (source `guardrail`) when it fails. Emergency advice never reaches `say`: it is a fixed, clinician-approved
 *   script (source `fixed`).
 * - `route` (optional) is the hand-off the Orchestrator's rule makes next. If a live reply suggests another agent
 *   (`handoffTo`), the rule still wins and the engine counts it as "AI overruled".
 * - `understand` reads a free-text reply into one of the card's options. `PreparedAi` uses the prototype's keyword readers.
 */
export type SaySource = 'live' | 'prepared' | 'guardrail'
export interface SayRequest {
  /** The skill (sub-agent) speaking, or `familyChat` for the family messages panel. */
  skill: AgentId | 'familyChat'
  domain: DomainId
  /** Who the words are for, e.g. "Saeed", "Amna (parent of Hind)", "the clinic team (Dr Omar Haddad)". */
  audience: string
  /** The language Noa speaks ("Noa speaks" switch): English, or clear Gulf-friendly Modern Standard Arabic. */
  lang: NoaLang
  /** Facts the text may use (JSON-able, already translated to `lang`). Nothing outside them may be stated. */
  facts: Record<string, unknown>
  /** What this turn must do, in English (an instruction to the model, never shown). */
  task: string
  /** The prepared text in `lang`: shown when the AI is off, fails or is overruled by the guardrail. */
  fallback: string
  /** Word limit (55 by default, 80 for the referral note, 45 for family messages). */
  maxWords: number
  /** The hand-off the rules make after this turn, if any. */
  route?: { rule: RuleId; to: AgentId; options: AgentId[] }
}
export interface SayResult {
  text: string
  source: SaySource
  /** Why the prepared text is shown (AI off, busy, wrong shape), in `lang` or English. */
  note?: string
  /** A live model's suggested next agent (compared with `route`). */
  handoffTo?: AgentId | null
}
export interface UnderstandRequest {
  /** The card's question id (rf, sym, pref, time, book, words). */
  qid: string
  /** The question in plain English, for the model. */
  question: string
  options: { id: string; label: string }[]
  reply: string
  lang: NoaLang
}
export interface UnderstandResult { choice: string; summary: string; source: 'live' | 'keyword' }
export interface NoaAi {
  say(req: SayRequest): Promise<SayResult>
  understand(req: UnderstandRequest): Promise<UnderstandResult>
}

/** What live text may never contain (prototype GUARD): a dose, a diagnosis, or advice against emergency care. */
export type GuardHit = 'dose' | 'diagnosis' | 'againstEmergency'
const GUARD: [RegExp, GuardHit][] = [
  [/\b\d+(\.\d+)?\s?(mg|mcg|micrograms?|units?|ml)\b/i, 'dose'],
  [/\byou (have|had|are having) (a |an )?(stroke|heart attack|diabetes|atrial fibrillation|af|cancer)\b/i, 'diagnosis'],
  [/\b(don'?t|do not|no need to) (call|go to) (998|999|911|hospital|the emergency)/i, 'againstEmergency'],
]
export function guard(text: string): GuardHit | null {
  for (const [re, hit] of GUARD) if (re.test(text)) return hit
  return null
}

/** The prototype keyword readers (used when the AI is off). Input is lower-cased. */
export const KEYWORDS: Record<string, (t: string) => string> = {
  rf: (t) => (/weak|numb|droop|arm|face/.test(t) ? 'weak' : /chest|pain/.test(t) ? 'chest' : /faint|dizzy/.test(t) ? 'faint' : /pound|racing|heart/.test(t) ? 'palp' : 'none'),
  sym: (t) => (/thirst|tired|urin|pee/.test(t) ? 'thirst' : /blood|stool|bowel/.test(t) ? 'bowel' : /breast|lump/.test(t) ? 'breast' : /chest|tight/.test(t) ? 'chest' : 'none'),
  pref: (t) => (/female|woman|lady/.test(t) ? 'female' : /home|kit/.test(t) ? 'home' : 'one'),
  time: (t) => (/even|night/.test(t) ? 'eve' : /sat|weekend/.test(t) ? 'sat' : /after|15|school/.test(t) ? 'pm' : 'am'),
  book: (t) => (/not now|later|no thanks/.test(t) ? 'later' : /time|change|evening|morning|saturday/.test(t) ? 'change' : /why|fine|bother/.test(t) ? 'why' : 'book'),
  words: (t) => (/none|no |one|two|1|2/.test(t) ? 'few' : /many|lots|more/.test(t) ? 'many' : 'some'),
}

/**
 * Two readers on the risky questions (AI plan, "Two readers on the risky label"): for these a free-text reply is read by the AI port
 * AND by the keyword reader, and the more urgent reading wins, so a model can never talk a red flag down. Higher rank = more urgent;
 * on a tie the AI's reading stands. Other questions (how, when, booking) trust the AI port.
 */
export const URGENCY: Record<string, Record<string, number>> = {
  rf: { weak: 3, chest: 3, faint: 3, palp: 1, none: 0 },
  sym: { thirst: 1, bowel: 1, breast: 1, chest: 1, none: 0 },
  words: { few: 2, some: 1, many: 0 },
}
export function moreUrgent(qid: string, ai: string, keyword: string): string {
  const r = URGENCY[qid]
  if (!r) return ai
  return (r[keyword] ?? 0) > (r[ai] ?? 0) ? keyword : ai
}

/** The default port: prepared text and the keyword reader, no network. */
export class PreparedAi implements NoaAi {
  async say(req: SayRequest): Promise<SayResult> {
    return { text: req.fallback, source: 'prepared' }
  }
  async understand(req: UnderstandRequest): Promise<UnderstandResult> {
    const read = KEYWORDS[req.qid]
    const choice = read ? read(req.reply.toLowerCase()) : req.options[0]?.id ?? ''
    return { choice, summary: '', source: 'keyword' }
  }
}
