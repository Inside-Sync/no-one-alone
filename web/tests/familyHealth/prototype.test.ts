import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { FamilyHealthEngine, PersonId, TestCaseId } from '@/features/familyHealth'
import { drive, engine, view, type Script } from './helpers'

/**
 * Every journey of the prototype logs (scratchpad/v2/logs, extracted into fixtures/prototype-runs.json: the "Everything so far"
 * feed, rules applied and counters) replayed through the engine and compared item by item: stages, hand-offs (rule and reason),
 * agent words, system lines, answers picked, flags, pathways, final status, rules and Department of Health counters.
 *
 * Where a prototype bug is fixed on purpose (plan section 5), the expected prototype text is rewritten by `FIXES` below, so each
 * intended difference is listed here and nothing else may differ.
 */
type Run = { stages: string[]; hand: { rule: string; reason: string }[]; agents: { src: string; text: string }[]; sys: string[]; picks: string[]; flags: unknown[]; paths: unknown[]; done: string | null; rules: string[]; gov: Record<string, number>; counters: Record<string, number> }
const RUNS = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/prototype-runs.json'), 'utf8')) as Record<string, Run>

/** How each run was played: a test case or a tree node, then the answers that differ from Next. */
const PLAYS: Record<string, { tc?: TestCaseId; person?: PersonId; script?: Script }> = {
  s0: { tc: 's0' },
  s2: { tc: 's2' },
  s3: { tc: 's3' },
  's3-confused': { tc: 's3', script: { hypo: 'confused' } },
  's0-weak': { tc: 's0', script: { rf: 'weak' } },
  's0-chest': { tc: 's0', script: { rf: 'chest' } },
  'saeed-node': { person: 'saeed', script: { book: ['why', 'change', 'book'], time2: 'sat' } },
  'moza-welcome': { tc: 'm1' },
  'moza-node-later': { person: 'moza', script: { book: 'later' } },
  'khalid-welcome': { person: 'khalid' },
  'khalid-alt': { person: 'khalid', script: { protect: (c) => ({ genomic: false, contacts: c.type === 'protect' ? c.sel : [] }), sym: 'chest', quit: 'no', book: 'later' } },
  'khalid-notnow-routine': { person: 'khalid', script: { book: 'later' } },
  k4: { tc: 'k4' },
  'amna-node': { person: 'amna' },
  'amna-breast': { person: 'amna', script: { sym: 'breast', pref: 'female' } },
  'hamdan-node': { person: 'hamdan' },
  'hamdan-squint': { person: 'hamdan', script: { vision: 'squint', hearing: 'repeat' } },
  'hind-node': { person: 'hind' },
  'hind-few': { tc: 'h1' },
}

/** Intended differences (prototype bug fixes). [run filter or null for all, find, replace]. */
const FIXES: [RegExp | null, string | RegExp, string | ((m: string, ...g: string[]) => string)][] = [
  // B7: lower-casing only the first letter of a fragment ("Saeed’s", "IFHAS", "HbA1c", "mmol/L", "Mon 30 Nov", "PHQ-9" keep their case).
  [null, 'saeed’s usual', 'Saeed’s usual'],
  [null, 'ifhas adult', 'IFHAS adult'],
  [null, 'hba1c', 'HbA1c'],
  [null, 'mmol/l', 'mmol/L'],
  [null, '(booked mon 30 nov)', '(booked Mon 30 Nov)'],
  [null, '(phq-9)', '(PHQ-9)'],
  // B7: grammar of one finding, "Mother (Mother)", HDL with one decimal, a child's age in years, "your last record" for a child.
  [null, '1 finding that change the plan', '1 finding that changes the plan'],
  [null, 'Mother (Mother): ', 'Mother: '],
  [null, /^Cholesterol 4\.6\/1$/, 'Cholesterol 4.6/1.0'],
  [null, 'Hamdan Al Mansoori, 60 months', 'Hamdan Al Mansoori, 5 years'],
  [null, 'Noa read the passport, your last record', 'Noa read the passport, the last record'],
  // B7: the emergency script continues the sentence in lower case.
  [null, /^Abu Rashid, (Your|Face|Chest|Confusion)/, (_m, w) => `Abu Rashid, ${w.toLowerCase()}`],
  // B8: the urgent Protect line no longer claims Saeed chose anything.
  [null, /Noa asks nothing new now; (\w+) sees the result, as \w+ chose\./, 'Noa asks nothing new now; $1, the family contact on file, sees the result.'],
  // B6: low glucose and high blood pressure do not open with "your heart is racing… speech first".
  [/^s3/, 'Abu Rashid, because your heart is racing at rest, I’ll check your speech first. Please say “The sky is blue in Abu Dhabi”.', 'Abu Rashid, your glucose dropped overnight, so in 15 minutes, after the fast sugar, I’ll check how you feel.'],
  [/^k4$/, 'Khalid, because your heart is racing at rest, I’ll check your speech first. Please say “The sky is blue in Abu Dhabi”.', 'Khalid, a reading needs a doctor today, and that review goes first. Meanwhile, a few minutes by voice: diabetes risk test, sleep apnoea, mood. Then I’ll find the right checks for you.'],
  [/^s3/, 'Auto-prompted check: speech first, then red-flag questions', 'Auto-prompted check: a 15-minute recheck after fast sugar'],
  [/^k4$/, 'Auto-prompted check: speech first, then red-flag questions', 'Home screening by voice: tests chosen for Khalid'],
  // B6: Guardian quotes the usual heart band only for heart alerts.
  [/^(s3|k4)/, / Your usual is \d+–\d+, regular\./, ''],
  // Glucose readings come from the glucose sensor, not the watch.
  [/^s3/, /^Watch via the InsideSync app$/, 'MAYBE_CGM'],
  // B11: "Doctor appointment this week" is due within 1 week.
  [null, 'doctor appointment this week (within 2 weeks)', 'doctor appointment this week (within 1 week)'],
]
const SYM_DOC = /^Doctor appointment this week/

function fixString(run: string, s: string): string {
  let out = s
  for (const [filter, find, rep] of FIXES) {
    if (filter && !filter.test(run)) continue
    if (typeof find === 'string') out = out.split(find).join(typeof rep === 'string' ? rep : rep(find))
    else out = typeof rep === 'string' ? out.replace(find, rep) : out.replace(find, rep)
  }
  return out
}
function fix<T>(run: string, x: T): T {
  if (typeof x === 'string') return fixString(run, x) as T
  if (Array.isArray(x)) return x.map((v) => fix(run, v)) as T
  if (x && typeof x === 'object') {
    const o = Object.fromEntries(Object.entries(x).map(([k, v]) => [k, fix(run, v)])) as Record<string, unknown>
    // B11 on the clinical column: a symptom's doctor appointment is within 1 week (due Fri 27 Nov).
    if (typeof o.t === 'string' && SYM_DOC.test(o.t) && typeof o.urg === 'string') o.urg = 'Within 1 week · by Fri 27 Nov'
    return o as T
  }
  return x
}
const strip = (s: string) => s.replace(/^(✓|🔒|🩺|⛔|⬆️|👪|🔁|📅|📦|🧒|🤖|🔤) /u, '')

async function play(name: string): Promise<ReturnType<typeof view>> {
  const p = PLAYS[name], e: FamilyHealthEngine = engine()
  // Runs counted as the 2nd journey: the prototype auto-ran s0 on load, and the case was picked before s0 said anything.
  if (RUNS[name].gov.journeys === 2) void e.runTestCase('s0')
  void (p.tc ? e.runTestCase(p.tc) : e.startJourney(p.person as PersonId))
  return view(await drive(e, p.script))
}

describe.each(Object.keys(PLAYS))('prototype run %s', (name) => {
  const want = RUNS[name]
  let got: Awaited<ReturnType<typeof play>>
  beforeAll(async () => { got = await play(name) })

  test('same stages and hand-offs (order, rules, reasons)', () => {
    expect(got.stages).toEqual(want.stages)
    expect(got.hand).toEqual(fix(name, want.hand))
  })
  test('same agent words and sources', () => {
    expect(got.agents).toEqual(fix(name, want.agents))
  })
  test('same system lines and picked answers', () => {
    expect(got.sys).toEqual(fix(name, want.sys.map(strip)))
    // The newer prototype stops at Detect on the go card ("Started" when Next starts it); the logs predate it.
    expect(got.picks.filter((x) => x !== 'waiting' && x !== 'Started')).toEqual(fix(name, want.picks))
  })
  test('same flags', () => {
    const exp = fix(name, want.flags) as { flags: { src: string; rule: string }[] }[]
    for (const f of exp) for (const g of f.flags) if (g.src === 'MAYBE_CGM') g.src = g.rule === 'L1' ? 'Glucose sensor via the InsideSync app' : 'Watch via the InsideSync app'
    expect(got.flags).toEqual(exp)
  })
  test('same pathways', () => {
    expect(got.paths).toEqual(fix(name, want.paths))
  })
  test('same end, rules applied and counters', () => {
    expect(got.done).toEqual(want.done ? fix(name, strip(want.done)) : null)
    expect(got.rules).toEqual(want.rules)
    expect(got.gov).toEqual(want.gov)
    // B2: in the s2 log the auto-run s0, never cancelled, still spoke one prepared turn into the counters.
    expect(got.counters).toEqual(name === 's2' ? { ...want.counters, prepared: want.counters.prepared - 1 } : want.counters)
  })
})
