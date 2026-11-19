import i18n from '@/i18n'
import { FamilyHealthEngine, FH_NS, URGENCY, dueBy, textOf, type AnswerValue, type Card, type EngineOptions, type FeedItem, type Snapshot } from '@/features/familyHealth'

/** English resolver of the familyHealth descriptors. */
export const T = textOf(i18n.getFixedT('en', FH_NS) as unknown as (k: string, o?: Record<string, unknown>) => string, 'en')
export const TAR = textOf(i18n.getFixedT('ar', FH_NS) as unknown as (k: string, o?: Record<string, unknown>) => string, 'ar')

export const engine = (o: EngineOptions = {}) => new FamilyHealthEngine(o)

/**
 * Answers for a run, by choice question id (`rf`, `sym`, `book`...) or card type (`protect`, `speech`, `qset`, `din`).
 * An array answers successive cards of that key in order; anything not scripted takes the card default (Next).
 */
export type Script = Record<string, AnswerValue | ((c: Card) => AnswerValue) | (AnswerValue | ((c: Card) => AnswerValue))[]>

export async function drive(e: FamilyHealthEngine, script: Script = {}, max = 80): Promise<Snapshot> {
  const used: Record<string, number> = {}
  await e.whenIdle()
  for (let i = 0; i < max; i++) {
    const c = e.getSnapshot().pending
    if (!c) break
    const key = c.type === 'choice' ? c.qid : c.type
    let v = script[key]
    if (Array.isArray(v) && !(c.type === 'din')) { const n = used[key] ?? 0; used[key] = n + 1; v = v[Math.min(n, v.length - 1)] }
    if (v === undefined) e.next()
    else {
      const val = typeof v === 'function' ? v(c) : v
      if (c.type === 'speech' && typeof val === 'string') e.useSample(val as 'usual' | 'unclear' | 'slurred')
      else expect(e.answer(c.id, val as AnswerValue)).toBe(true)
    }
    await e.whenIdle()
  }
  return e.getSnapshot()
}

export const of = <K extends FeedItem['kind']>(feed: FeedItem[], kind: K) => feed.filter((f): f is Extract<FeedItem, { kind: K }> => f.kind === kind)

/** The run as the prototype logs show it (English text), for comparison with `tests/familyHealth/fixtures/prototype-runs.json`. */
export function view(s: Snapshot) {
  const f = s.feed
  return {
    stages: of(f, 'stage').map((x) => T({ k: `stages.${x.stage}.name` }).toUpperCase()),
    hand: of(f, 'hand').map((h) => ({ rule: h.rule, reason: T(h.reason) })),
    agents: of(f, 'agent').map((a) => ({ src: a.source === 'fixed' ? 'Fixed script' : a.source === 'live' ? 'Live AI' : a.source === 'guardrail' ? 'Guardrail' : 'Prepared', text: T(a.text) })),
    sys: of(f, 'sys').map((x) => T(x.text)),
    picks: of(f, 'card').map((c) => T(c.picked)),
    flags: of(f, 'flags').map((x) => ({ note: x.note ? T(x.note) : null, flags: x.flags.map((g) => ({ t: T(g.title), rule: g.rule, factors: g.factors.map(T), src: T(g.src), cert: T(g.cert) })) })),
    paths: of(f, 'path').map((p) => ({
      note: p.note ? T(p.note) : null,
      pop: p.path.pop.map((x) => ({ name: T(x.name), st: x.st, urg: `${T({ k: `urgency.${x.u}` })} · ${T(dueBy(x.u, s.clock))}`, rule: T(x.rule), you: T(x.you), where: `${T(x.where)} · 🕒 ${T(x.when)}` })),
      clin: p.path.clin.map((x) => ({ t: T(x.t), urg: `${T({ k: `urgency.${x.u}` })} · ${T(dueBy(x.u, s.clock))}`, why: T(x.why) })),
    })),
    done: s.journey?.done ? T(s.journey.done) : null,
    rules: s.rulesHit.map((r) => r.rule),
    gov: { journeys: s.gov.journeys, booked: s.gov.booked, '“why?” answered': s.gov.barriers, referrals: s.gov.referrals, 'rules used': s.rulesHit.length, 'not now': s.gov.notNow },
    counters: s.calls,
  }
}
export { URGENCY }
