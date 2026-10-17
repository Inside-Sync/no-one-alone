import type { DemoScenario } from '@/data/contract'

/** The Emergency tab's Simulator: the one night alert case, and the readings and clips that follow from it. */
export type SimSpeech = 'slurred' | 'mic'
export interface SimSettings { hr: number; stillMin: number; speech: SimSpeech; davidPicksUp: boolean }
export interface Reading { minute: number; hr: number; moving: boolean }

export const NIGHT_ALERT: SimSettings = { hr: 137, stillMin: 10, speech: 'slurred', davidPicksUp: true }

export const scenarioFor = (): DemoScenario => 'stroke'

export const overridesFor = (s: SimSettings) => ({ hr: s.hr, movementMin: s.stillMin })

/** Clips and a live mic answer need longer than the server's default 10 s no-reply window. */
export const NO_REPLY_SECONDS = 45

export function clipFor(s: SimSettings, questionIndex: number): string | null {
  if (s.speech !== 'slurred' || questionIndex < 0 || questionIndex > 1) return null
  return `/sim/red-${questionIndex}.mp3`
}

const WOBBLE = [0, 2, -1, 1, -2, 1, 0, -1]

/** 40 one-minute readings ending now: baseline while moving, then `hr` while still, each with a small fixed wobble. */
export function simSeries(s: SimSettings, baseline: number): Reading[] {
  const still = Math.min(s.stillMin, 40)
  return Array.from({ length: 40 }, (_, i) => {
    const high = i >= 40 - still
    return { minute: i - 39, hr: (high ? s.hr : baseline) + WOBBLE[(i + 1) % WOBBLE.length], moving: !high }
  })
}

/** The verify rule respond-agent applies: heart rate above 120 while still for 10 minutes or more. */
export const ruleChecks = (s: SimSettings) => ({ still: s.stillMin >= 10, hr: s.hr > 120 })
