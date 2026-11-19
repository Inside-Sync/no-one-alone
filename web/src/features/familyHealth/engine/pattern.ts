import { DEVICES, PEOPLE } from '../data/people'
import { SIGNAL } from '../data/thresholds'
import type { AdultProfile, PersonId, Txt } from '../data/types'
import { tx } from './text'

/**
 * Noa Guardian's live pattern check against the person's own normal (prototype patternHTML): the series behind each sparkline,
 * generated from a fixed seed per person (simulated readings, the same on every run).
 */
export interface PatternCard {
  id: 'hr' | 'bp' | 'glu' | 'wt' | 'steps'
  title: Txt
  values: number[]
  /** The own or healthy band drawn behind the line. */
  band: [number, number]
  /** Dashed split between the 14 days and today (heart only). */
  split?: number
  /** From this index the line is drawn red (out of band). */
  flagFrom: number | null
  caption: Txt
  status: Txt
  statusTone: 'bad' | 'warn' | null
  hot: boolean
}

/** Prototype hsh: a small string hash. */
export function hsh(t: string): number {
  let h = 7
  for (const c of t) h = (h * 31 + c.charCodeAt(0)) % 9973
  return h
}
/** Prototype rnd: a Park–Miller generator. */
export function rnd(seed: number): () => number {
  let x = seed % 2147483647
  return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646 }
}

export function patternCards(k: PersonId, p: AdultProfile): PatternCard[] {
  const devs = (DEVICES[k] ?? []).map((d) => d.value), r = rnd(hsh(k) * 97 + 1)
  const u = PEOPLE[k].usual ?? [62, 72], cards: PatternCard[] = []
  if (devs.includes('hr')) {
    const trig = p.hr >= SIGNAL.hrHigh || p.hr < SIGNAL.hrLow
    const days = Array.from({ length: 14 }, () => Math.round(u[0] + r() * (u[1] - u[0])))
    const today = Array.from({ length: 16 }, (_, i) => (trig ? (i < 5 ? Math.round(u[0] + r() * (u[1] - u[0])) : Math.round(p.hr - 6 + r() * 8 + (i >= 6 ? 6 : 0))) : Math.round(u[0] + r() * (u[1] - u[0]))))
    if (trig) today[15] = p.hr
    cards.push({
      id: 'hr', title: tx('pattern.hr.title'), values: days.concat(today), band: [u[0], u[1]], split: 14, flagFrom: trig ? 19 : null,
      caption: tx('pattern.hr.caption', { lo: u[0], hi: u[1], thr: SIGNAL.hrHigh }),
      status: trig ? tx(p.hr < SIGNAL.hrLow ? 'pattern.hr.slow' : 'pattern.hr.hot', { hr: p.hr, mins: SIGNAL.racingMinutes }) : tx('pattern.hr.ok', { hr: today[15] }),
      statusTone: trig ? 'bad' : null, hot: trig,
    })
  }
  if (devs.includes('bp')) {
    const mo = Array.from({ length: 12 }, (_, i) => Math.round(p.sbp - ((p.sbpTrend || 0) * (11 - i)) / 11 * 3 - 3 + r() * 6))
    mo[11] = p.sbp
    const hi = p.sbp >= SIGNAL.sbpVeryHigh || p.dbp >= SIGNAL.dbpVeryHigh, up = (p.sbpTrend || 0) >= 2
    cards.push({
      id: 'bp', title: tx('pattern.bp.title'), values: mo, band: [110, 135], flagFrom: hi ? 10 : null, caption: tx('pattern.bp.caption'),
      status: hi ? tx('pattern.bp.hot', { sbp: p.sbp, dbp: p.dbp }) : up ? tx('pattern.bp.rising', { trend: p.sbpTrend, sbp: p.sbp, dbp: p.dbp }) : tx(p.bpTx ? 'pattern.bp.nowTx' : 'pattern.bp.now', { sbp: p.sbp, dbp: p.dbp }),
      statusTone: hi ? 'bad' : up ? 'warn' : null, hot: hi,
    })
  }
  if (devs.includes('glu')) {
    const low = p.glu != null && p.glu < SIGNAL.gluL1, g = p.glu ?? 6.8
    const night = Array.from({ length: 24 }, (_, i) => Math.round((low ? (i < 8 ? 7.2 - i * 0.12 : i < 14 ? Math.max(g, 6.2 - (i - 8) * 0.6) : g + 0.2 * (i - 14)) : 6.4 + r() * 2.4) * 10) / 10)
    if (low) night[13] = g
    cards.push({
      id: 'glu', title: tx('pattern.glu.title'), values: night, band: [3.9, 10], flagFrom: low ? 11 : null, caption: tx('pattern.glu.caption'),
      status: low ? tx('pattern.glu.hot', { glu: g }) : tx('pattern.glu.ok'), statusTone: low ? 'bad' : null, hot: low,
    })
  }
  if (devs.includes('wt')) {
    const w = Array.from({ length: 12 }, (_, i) => Math.round((p.wt - ((p.bmiTrend || 0) * 3 * (11 - i)) / 11 + r() * 0.8) * 10) / 10)
    const rising = (p.bmiTrend || 0) > 0
    cards.push({ id: 'wt', title: tx('pattern.wt.title'), values: w, band: [p.wt - 6, p.wt - 2], flagFrom: null, caption: tx('pattern.wt.caption', { bmi: p.bmi }), status: tx(rising ? 'pattern.wt.rising' : 'pattern.wt.stable'), statusTone: rising ? 'warn' : null, hot: false })
  }
  const st = Array.from({ length: 14 }, () => Math.round(p.steps * (0.7 + r() * 0.6)))
  const lowSteps = p.steps < SIGNAL.stepsLow
  cards.push({ id: 'steps', title: tx('pattern.steps.title'), values: st, band: [7000, 10000], flagFrom: null, caption: tx('pattern.steps.caption'), status: tx(lowSteps ? 'pattern.steps.low' : 'pattern.steps.avg', { steps: p.steps }), statusTone: lowSteps ? 'warn' : null, hot: false })
  return cards
}

/**
 * The live wearables box (prototype syncVals): the heart value follows the alert (today's reading when a heart rule fired, the
 * middle of the own band otherwise). B10: blood pressure is the recorded systolic/diastolic, not systolic × 0.62.
 */
export function syncValues(k: PersonId, p: AdultProfile, urgentRule: string | null) {
  const wake = !!urgentRule && urgentRule.startsWith('G')
  const u = PEOPLE[k].usual ?? [62, 72]
  return { hr: wake ? p.hr : Math.round((u[0] + u[1]) / 2), irr: wake && p.irr, hot: wake && p.hr >= SIGNAL.hrHigh, sbp: p.sbp, dbp: p.dbp, bmi: p.bmi, glu: p.glu ?? null, steps: p.steps }
}
