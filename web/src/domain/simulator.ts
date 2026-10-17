import type { DemoScenario } from '@/data/contract'

/** The Emergency tab's Simulator: a ticking watch the operator drives with sliders, and who answers the phone. */
export type SimSpeech = 'slurred' | 'mic'
export interface SimSettings { speech: SimSpeech; davidPicksUp: boolean }
export interface Reading { minute: number; hr: number; moving: boolean }
/** `clock` is minutes after midnight of the newest reading. */
export interface Watch { readings: Reading[]; clock: number; hr: number; stillMin: number }

export const SIM_DEFAULTS: SimSettings = { speech: 'mic', davidPicksUp: true }

export const scenarioFor = (): DemoScenario => 'stroke'

/** Clips and a live mic answer need longer than the server's default 10 s no-reply window. */
export const NO_REPLY_SECONDS = 45

export function clipFor(s: SimSettings, questionIndex: number): string | null {
  if (s.speech !== 'slurred' || questionIndex < 0 || questionIndex > 1) return null
  return `/sim/red-${questionIndex}.mp3`
}

export const ALERT_MIN = 10
export const STILL_MAX = 15
export const HR_MIN = 45
export const HR_MAX = 180

const SIZE = 40
const START_CLOCK = 90
const WOBBLE = [0, 2, -1, 1, -2, 1, 0, -1]
const wobble = (n: number) => WOBBLE[((n % WOBBLE.length) + WOBBLE.length) % WOBBLE.length]
// Above the rule the wobble never dips a reading to 120.
const hiHr = (hr: number, n: number) => Math.max(121, hr + wobble(n))

const history = (hrAt: (i: number) => number, movingAt: (i: number) => boolean): Reading[] =>
  Array.from({ length: SIZE }, (_, i) => ({ minute: START_CLOCK - SIZE + 1 + i, hr: hrAt(i), moving: movingAt(i) }))

export function blankWatch(): Watch {
  return { readings: history((i) => 64 + wobble(i), () => true), clock: START_CLOCK, hr: 64, stillMin: 0 }
}

export type PresetId = 'night'
const NIGHT_RISE = [124, 128, 132, 134, 138, 141]
export const PRESETS: Record<PresetId, () => Watch> = {
  night: () => ({
    readings: history((i) => NIGHT_RISE[i - (SIZE - NIGHT_RISE.length)] ?? 60 + wobble(i), (i) => i < SIZE - 8),
    clock: START_CLOCK, hr: 142, stillMin: 8,
  }),
}

export function tick(w: Watch): Watch {
  const minute = w.readings[w.readings.length - 1].minute + 1
  return {
    readings: [...w.readings, { minute, hr: w.hr > 120 && w.stillMin > 0 ? hiHr(w.hr, minute) : w.hr + wobble(minute), moving: w.stillMin === 0 }].slice(-SIZE),
    clock: w.clock + 1,
    hr: w.hr,
    stillMin: w.stillMin > 0 ? Math.min(w.stillMin + 1, STILL_MAX) : 0,
  }
}

/** Like the artifact's `stillSet`: with HR above 120 the newly still readings take that HR, so the rule can fire at once. */
export function setStill(w: Watch, n: number): Watch {
  const from = w.readings.length - n
  return {
    ...w,
    stillMin: n,
    readings: w.readings.map((r, i) => ({ ...r, moving: i < from, hr: i >= from && w.hr > 120 ? hiHr(w.hr, r.minute) : r.hr })),
  }
}

/** Like the artifact's `hrS` handler: above 120 the still readings at or below the line take the new HR. */
export function setHr(w: Watch, hr: number): Watch {
  if (w.stillMin === 0 || hr <= 120) return { ...w, hr }
  const from = w.readings.length - w.stillMin
  return { ...w, hr, readings: w.readings.map((r, i) => (i >= from && r.hr <= 120 ? { ...r, hr: hiHr(hr, r.minute) } : r)) }
}

/** The verify rule respond-agent applies: the trailing run of readings above 120 while not moving. */
export function alertRun(readings: Reading[]): number {
  let n = 0
  for (let i = readings.length - 1; i >= 0 && readings[i].hr > 120 && !readings[i].moving; i--) n++
  return n
}

export type WatchNote = 'alert' | 'moving' | 'resting' | 'counting' | 'normal'
export function watchNote(w: Watch): WatchNote {
  const run = alertRun(w.readings)
  if (run >= ALERT_MIN) return 'alert'
  if (w.hr > 120 && w.stillMin === 0) return 'moving'
  if (w.stillMin > 0 && w.hr <= 120) return 'resting'
  return run > 0 ? 'counting' : 'normal'
}

const pad = (n: number) => String(n).padStart(2, '0')
export const clockText = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}
