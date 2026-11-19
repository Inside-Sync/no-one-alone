import type { JourneyId } from '../data/types'
import type { SafetyInputs, SpeechResult, Triggers } from './types'

/** Rules R1 to R4 as booleans (prototype triggers). R1 additionally needs the 10 minutes to have passed (see `runLen`). */
export function triggers(I: SafetyInputs): Triggers {
  return {
    hr: I.hr > 120 && I.still && I.dur >= 10,
    fall: I.fall && I.floor >= 2,
    hypo: I.glu != null && I.glu < 4,
    hypoS: I.glu != null && I.glu < 3,
    hf: I.wt >= 2 || I.spo2 <= 92,
    spo2c: I.spo2 < 90,
  }
}

/** Minutes in a row, ending now, with heart rate above 120 while not moving. */
export function runLen(read: number[], mv: number[]): number {
  let k = 0
  for (let i = read.length - 1; i >= 0; i--) {
    if (read[i] > 120 && !mv[i]) k++
    else break
  }
  return k
}

/** The decision ladder (R5 to R11): every 998 line before the home lines. Returns the journey, or null for "stand down". */
export function choosePath(tr: Triggers, sp: SpeechResult, ans: string | null): JourneyId | null {
  const noAns = !sp.said || ans === 'none'
  const sRed = sp.lvl === 'red'
  // 998 lines first: one danger sign is enough, and a second sign never lowers the response.
  if (tr.hypo && (sRed || noAns || ans === 'confused')) return 'hypo_em'
  if (tr.fall && (ans === 'cant' || noAns)) return 'fall_em'
  if (sRed || noAns) return 'stroke_em'
  if (tr.spo2c || ans === 'rest') return 'hf_em'
  if (tr.hypo) return 'hypo_home'
  if (tr.fall) return 'fall_minor'
  if (tr.hf) return 'hf_clinic'
  return null
}

/** The team an alert row names for a path. */
export const alertTeamKey = (path: JourneyId): string =>
  /_em$/.test(path) ? 'teams.emergency' : path === 'hf_clinic' ? 'teams.hfNurse' : path === 'fall_minor' ? 'teams.fallsClinic' : 'teams.familyDoctor'

/** Stroke-risk score (CHA2DS2-VASc) as the prototype computes it (a stroke adds 2). */
export const chads = (p: { age: number; sex: string; htn: boolean; dm: boolean; hf: boolean }, stroke: boolean): number =>
  (p.age >= 75 ? 2 : p.age >= 65 ? 1 : 0) + (p.sex === 'F' ? 1 : 0) + (p.htn ? 1 : 0) + (p.dm ? 1 : 0) + (p.hf ? 1 : 0) + (stroke ? 2 : 0)
