import { BENCH_GROUPS, type BenchGroup, type Scenario, type ScenarioResult } from './types'
import { RULE_IDS } from './scenarios'

/** A proportion with its 95% Wilson score interval. */
export interface Rate { n: number; k: number; p: number; lo: number; hi: number }

/** 95% Wilson score interval for k successes out of n (z = 1.96). With n = 0 the interval is the whole 0 to 1 range and p is 0. */
export function wilson(k: number, n: number, z = 1.96): Rate {
  if (n <= 0) return { n: 0, k: 0, p: 0, lo: 0, hi: 1 }
  const p = k / n, z2 = z * z
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n)
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n)
  return { n, k, p, lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) }
}

export interface Confusion { tp: number; fn: number; fp: number; tn: number }

/** The safety scenarios that reach a decision (the ones the "needs 998 now" question is asked of). */
export const isCritical = (s: Scenario): boolean => s.setup.kind === 'safety' && s.expected.decision !== 'refused'

/**
 * Confusion matrix of "needs 998 now" over the safety scenarios that reach a decision. Expected positive = the table says 998 now; predicted
 * positive = Noa decided 998 now. A scenario that stops without a decision counts as predicted negative.
 */
export function confusion(results: readonly ScenarioResult[]): Confusion {
  const c: Confusion = { tp: 0, fn: 0, fp: 0, tn: 0 }
  for (const r of results) {
    if (!isCritical(r.scenario)) continue
    const want = r.scenario.expected.decision === 'call-998', got = r.actual.decision === 'call-998'
    if (want && got) c.tp++
    else if (want) c.fn++
    else if (got) c.fp++
    else c.tn++
  }
  return c
}

export interface Critical { confusion: Confusion; sensitivity: Rate; specificity: Rate; ppv: Rate; npv: Rate; accuracy: Rate }
export function criticalMetrics(results: readonly ScenarioResult[]): Critical {
  const c = confusion(results)
  return {
    confusion: c,
    sensitivity: wilson(c.tp, c.tp + c.fn),
    specificity: wilson(c.tn, c.tn + c.fp),
    ppv: wilson(c.tp, c.tp + c.fp),
    npv: wilson(c.tn, c.tn + c.fn),
    accuracy: wilson(c.tp + c.tn, c.tp + c.tn + c.fp + c.fn),
  }
}

const rate = (rs: readonly ScenarioResult[]): Rate => wilson(rs.filter((r) => r.pass).length, rs.length)

function by<K extends string>(results: readonly ScenarioResult[], keys: readonly K[], key: (r: ScenarioResult) => K): Record<K, Rate> {
  const out = {} as Record<K, Rate>
  for (const k of keys) out[k] = rate(results.filter((r) => key(r) === k))
  return out
}

/** Rules whose scenarios are the negative controls of another rule (it must NOT fire there), besides the scenarios that name it in `near`. */
const CONTRAST: Record<string, string[]> = {
  R5: ['R1', 'R12'], R6: ['R9', 'R12'], R7: ['R11', 'R12'], R8: ['R10', 'R12'], R9: ['R6', 'R12'], R10: ['R8', 'R12'], R11: ['R7', 'R12'],
  R12: ['R1', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11'],
  P1: ['P2'], P2: ['P1'], P3: ['P4', 'P5', 'P6', 'P7', 'P8'], P4: ['P3', 'P5', 'P6', 'P7', 'P8'], P5: ['P3', 'P4', 'P6', 'P7', 'P8'],
  P6: ['P3', 'P4', 'P5', 'P7', 'P8'], P7: ['P3', 'P4', 'P5', 'P6', 'P8'], P8: ['P3', 'P4', 'P5', 'P6', 'P7'],
  F1: ['F2'], F2: ['F1'],
}

/** The scenario expects this rule to fire: it decides (R1 stand-down, R5 to R12, P, F) or it starts the check (R1 to R4). P9 fires when a result is referred. */
const fires = (s: Scenario, rule: string): boolean =>
  rule === 'P9' ? s.expected.rule === 'P9' && s.expected.decision === 'refer' : s.expected.rule === rule || s.expected.trigger === rule

const isNegative = (s: Scenario, rule: string): boolean =>
  !fires(s, rule) && (!!s.near?.includes(rule) || !!CONTRAST[rule]?.includes(s.expected.rule) || (rule === 'P9' && s.expected.rule === 'P9'))

export interface RuleCoverage { rule: string; positives: number; negatives: number }
/** For each rule: how many scenarios expect it to fire (positives) and how many are a negative control for it. */
export function ruleCoverage(list: readonly Scenario[]): RuleCoverage[] {
  return RULE_IDS.map((rule) => ({
    rule,
    positives: list.filter((s) => fires(s, rule)).length,
    negatives: list.filter((s) => isNegative(s, rule)).length,
  }))
}

export interface RuleRate extends Rate { rule: string; positives: number; negatives: number }
export function byRule(results: readonly ScenarioResult[]): RuleRate[] {
  return ruleCoverage(results.map((r) => r.scenario)).map((c) => {
    const rs = results.filter((r) => fires(r.scenario, c.rule) || isNegative(r.scenario, c.rule))
    return { ...rate(rs), rule: c.rule, positives: c.positives, negatives: c.negatives }
  })
}

export interface Metrics {
  total: number
  passed: number
  overall: Rate
  byGroup: Record<BenchGroup, Rate>
  byRule: RuleRate[]
  critical: Critical
  subgroups: {
    lang: Record<'en' | 'ar', Rate>
    time: Record<'day' | 'night', Rate>
    age: Record<'child' | '18-39' | '40-64' | '65+', Rate>
    level: Record<'easy' | 'tough', Rate>
  }
  /** The "needs 998 now" decision again, per subgroup (safety scenarios only). */
  criticalBy: { lang: Record<string, Critical>; time: Record<string, Critical>; age: Record<string, Critical>; level: Record<string, Critical> }
  failures: ScenarioResult[]
}

/** Every number the Benchmark tab and the report show. Pure: the same results always give the same metrics. */
export function computeMetrics(results: readonly ScenarioResult[]): Metrics {
  const crit = (key: (r: ScenarioResult) => string, keys: string[]) => Object.fromEntries(keys.map((k) => [k, criticalMetrics(results.filter((r) => key(r) === k))]))
  return {
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    overall: rate(results),
    byGroup: by(results, BENCH_GROUPS, (r) => r.scenario.group),
    byRule: byRule(results),
    critical: criticalMetrics(results),
    subgroups: {
      lang: by(results, ['en', 'ar'] as const, (r) => r.scenario.tags.lang),
      time: by(results, ['day', 'night'] as const, (r) => r.scenario.tags.time),
      age: by(results, ['child', '18-39', '40-64', '65+'] as const, (r) => r.scenario.tags.age),
      level: by(results, ['easy', 'tough'] as const, (r) => r.scenario.tags.level),
    },
    criticalBy: {
      lang: crit((r) => r.scenario.tags.lang, ['en', 'ar']),
      time: crit((r) => r.scenario.tags.time, ['day', 'night']),
      age: crit((r) => r.scenario.tags.age, ['child', '18-39', '40-64', '65+']),
      level: crit((r) => r.scenario.tags.level, ['easy', 'tough']),
    },
    failures: results.filter((r) => !r.pass),
  }
}

/** Percent with up to one decimal ("100%", "97.6%"). */
export const pct = (p: number): string => `${Math.round(p * 1000) / 10}%`
