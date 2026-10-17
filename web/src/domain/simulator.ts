import type { DemoScenario } from '@/data/contract'

/** The Emergency tab's Simulator: what the presenter picks, and the readings and clips that follow from it. */
export type SimPreset = 'night' | 'stairs' | 'asleep'
export type SimSpeech = 'clear' | 'slurred' | 'none'
export interface SimSettings { preset: SimPreset; hr: number; moving: boolean; stillMin: number; speech: SimSpeech; davidPicksUp: boolean }
export interface Reading { minute: number; hr: number; moving: boolean }

const PRESETS: Record<SimPreset, Omit<SimSettings, 'preset'>> = {
  night: { hr: 142, moving: false, stillMin: 4, speech: 'slurred', davidPicksUp: false },
  stairs: { hr: 136, moving: true, stillMin: 0, speech: 'clear', davidPicksUp: false },
  asleep: { hr: 57, moving: false, stillMin: 45, speech: 'clear', davidPicksUp: false },
}

export const presetSettings = (p: SimPreset): SimSettings => ({ preset: p, ...PRESETS[p] })

export const scenarioFor = (s: SimSettings): DemoScenario => (s.preset === 'stairs' ? 'false-alarm' : 'stroke')

export const overridesFor = (s: SimSettings) => ({ hr: s.hr, movementMin: s.moving ? 0 : s.stillMin })

/** Clips need longer than the server's default 10 s no-reply window. */
export const noReplySecondsFor = (s: SimSettings) => (s.speech === 'none' ? 10 : 15)

export function clipFor(s: SimSettings, questionIndex: number): string | null {
  if (s.speech === 'clear') return questionIndex >= 0 && questionIndex <= 3 ? `/sim/clear-${questionIndex}.mp3` : null
  if (s.speech === 'slurred') return questionIndex === 0 ? '/sim/clear-0.mp3' : questionIndex === 1 ? '/sim/slurred-1.mp3' : null
  return null
}

const WOBBLE = [0, 2, -1, 1, -2, 1, 0, -1]

/** 40 one-minute readings ending now: baseline with a small fixed wobble, then a 6-minute ramp to `hr`. */
export function simSeries(s: SimSettings, baseline: number): Reading[] {
  const still = s.moving ? 0 : Math.min(s.stillMin, 40)
  return Array.from({ length: 40 }, (_, i) => {
    const k = i - 33
    const hr = k > 0 ? Math.round(baseline + ((s.hr - baseline) * k) / 6) : baseline + WOBBLE[i % WOBBLE.length]
    return { minute: i - 39, hr, moving: i < 40 - still }
  })
}

/** The verify rule core-api applies: still for 2 min or more, and HR at least baseline + 30. */
export function ruleChecks(s: SimSettings, baseline: number) {
  const threshold = baseline + 30
  return { still: !s.moving && s.stillMin >= 2, hr: s.hr >= threshold, threshold }
}
