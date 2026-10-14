import type { Kpi, MiniStat, PillTone, Severity } from '../types'

/** Prototype tone strings: '' means good for KPI tiles. */
type KpiTone = '' | 'warn' | 'bad'

/** `[label, value, unit, colour, baseline, delta, tone, spark]` as in the prototype's tile arrays. */
export type KpiRow = [string, string, string, string, string, string, KpiTone, number[]]

/** `[emoji, label, value, unit, colour, baseline, delta, tone, spark]` (plain-language tiles). */
export type PlainKpiRow = [string, string, string, string, string, string, string, KpiTone, number[]]

const sev = (t: KpiTone): Severity => (t === '' ? 'good' : t)

export function kpi(r: KpiRow): Kpi {
  return { label: r[0], value: r[1], unit: r[2], color: r[3], baseline: r[4], delta: r[5], tone: sev(r[6]), spark: r[7] }
}

export function plainKpi(r: PlainKpiRow): Kpi {
  return {
    emoji: r[0], label: r[1], value: r[2], unit: r[3], color: r[4],
    baseline: r[5], delta: r[6], tone: sev(r[7]), spark: r[8],
  }
}

/** `[label, value, note, tone?]` as in the prototype's `.mini` cells. */
export type MiniRow = [string, string, string, Severity?]

export function mini(r: MiniRow): MiniStat {
  return r[3] ? { label: r[0], value: r[1], note: r[2], tone: r[3] } : { label: r[0], value: r[1], note: r[2] }
}

export type PillRow = [PillTone, string]
export const pill = (r: PillRow): { tone: PillTone; text: string } => ({ tone: r[0], text: r[1] })
