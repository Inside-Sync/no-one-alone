/** Thresholds of Noa's signal rules (prototype signalRules, hrThr). Demo values; a clinician signs them off before a pilot. */
export const SIGNAL = {
  /** Resting heart rate at or above this for 10+ minutes while inactive (G1). The prototype `hrThr`, the same for everyone. */
  hrHigh: 120,
  /** Resting heart rate under this (G3). */
  hrLow: 40,
  /** Very high blood pressure (B1): systolic or diastolic at or above. */
  sbpVeryHigh: 180, dbpVeryHigh: 120,
  /** High blood pressure (B2). */
  sbpHigh: 140, dbpHigh: 90,
  /** Low oxygen (O1): under. */
  spo2Low: 92,
  /** Weight support (W1): BMI at or above. */
  bmiHigh: 30,
  /** Activity plan (A1): steps a day under. */
  stepsLow: 4000,
  /** Glucose (ADA): level 2 under 3.0 (L1), level 1 under 3.9 (L2). */
  gluL2: 3.0, gluL1: 3.9,
  /** How long the racing heart lasted in the demo (minutes), shown in the auto-prompt. */
  racingMinutes: 22,
} as const

/** Framingham applies to ages 30 to 74 without a heart attack or stroke; 20% is high (F1), 10% moderate. */
export const RISK = { high: 0.2, mid: 0.1, ageMin: 30, ageMax: 74 } as const

/** Family-record rules: premature heart disease or stroke is under 55 in men and 65 in women; breast cancer before 50. */
export const FAMILY = { prematureMale: 55, prematureFemale: 65, dxaFrom: 65 } as const

/** Programme eligibility used by the screening history (prototype scrStatus). */
export const ELIGIBLE = { bowel: [40, 75], ifhas: [18, 75], dxaFrom: 65, breast: [40, 69], cervix: [25, 65], breastProgrammeFrom: 40 } as const

/** Waits (ms) of the prototype: around an agent's words, a hand-off, the pattern check. Zero under reduced motion and in tests. */
export const WAIT = { typing: 250, afterSay: 450, handoff: 1100, pattern: 500 } as const
/**
 * Without live AI the prototype's "writing…" dots show for only 250 ms. Prepared and fixed turns keep the dots up like a chat agent
 * writing: a base plus a little per word, capped. Live turns already take the model's own time, so they add nothing.
 */
export const WRITING = { base: 650, perWord: 25, max: 2000 } as const
export const writingMs = (words: number): number => Math.min(WRITING.max, WRITING.base + WRITING.perWord * Math.max(0, words))

/** The simulated clock starts here (20 Nov 2026 08:40, Abu Dhabi wall time kept as UTC arithmetic) and advances per stage. */
export const CLOCK_START = Date.UTC(2026, 10, 20, 8, 40)
export const STAGE_MINUTES = { detect: 0, protect: 1, home: 1, pathway: 4, referral: 1 } as const
