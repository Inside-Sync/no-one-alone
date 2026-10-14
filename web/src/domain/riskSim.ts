export type SimInput = {
  /** 60-100, default 86. */
  adherence: number
  /** 1500-7000 in steps of 100, default 3240. */
  steps: number
  /** 0 Low, 1 Medium, 2 High; default 1. */
  salt: 0 | 1 | 2
  hearingAids: boolean
}

export type RiskResult = { stroke: number; fall: number; admission: number; mci: number }

const SALT = [0.9, 1, 1.12] as const

/** Prototype `sim()` (line 1466): relative effects applied to her current 90-day risks. */
export function simulateRisk(i: SimInput): RiskResult {
  const stroke = 2.1 * Math.exp(-0.034 * (i.adherence - 86)) * SALT[i.salt] * Math.exp(-0.00004 * (i.steps - 3240))
  const fall = 21 * Math.exp(-0.00016 * (i.steps - 3240)) * (i.hearingAids ? 0.9 : 1)
  const admission = 14 * (0.5 * stroke / 2.1 + 0.5 * fall / 21)
  const mci = 3.1 * (i.hearingAids ? 0.82 : 1)
  return { stroke, fall, admission, mci }
}

/** Prototype `cell()` footer: change against the baseline, with a unicode minus. */
export function deltaLabel(v: number, base: number): { text: string; tone: 'good' | 'bad' | 'muted' } {
  const d = ((v - base) / base) * 100
  if (Math.abs(d) < 0.5) return { text: 'no change', tone: 'muted' }
  return {
    text: (d > 0 ? '+' : '−') + Math.abs(d).toFixed(0) + '% relative',
    tone: d <= -0.5 ? 'good' : 'bad',
  }
}

const OBSERVED = [128, 131, 133, 137, 140, 146]
const IF_NOTHING = [146, 148.5, 151, 153.5, 156]
const AT_100 = [146, 140, 136, 133, 131]

/** `bpChart()` (line 1449): the what-if line `sc` for a given adherence, plus the observed weeks. */
export function bpProjection(adherence: number): { observed: number[]; projected: number[] } {
  const f = adherence >= 86 ? (adherence - 86) / 14 : -(86 - adherence) / 26
  const projected = IF_NOTHING.map((v, i) => (f >= 0 ? v + (AT_100[i] - v) * f : v + i * 3 * -f))
  return { observed: [...OBSERVED], projected }
}
