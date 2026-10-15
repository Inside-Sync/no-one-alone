/**
 * The 02:03 night alert demo: the script (prototype `STEPS`, line 1558) and its player. Pure; no React.
 * Timing, flags and structure live here; every visible text is in the `live` namespace (`live:steps.{i}.*`,
 * `live:phase.*`, `live:level.*`, `live:sla.*`) and is looked up at call time, so it follows the language.
 */
import i18n from '@/i18n'

export type EmPhase = 'verify' | 'ask' | 'triage' | 'escalate' | 'handOff' | 'agent' | 'close'
export type EmLevel = 'ok' | 'monitor' | 'comeNow' | 'emergency' | 'checking' | 'helpArrived' | 'falseAlarm' | 'closed'

/** One step's structure (no text): clock time, minutes, phase and level ids, and the screen flags. */
export interface EmFrame {
  /** Clock time on the timeline. */
  t: string
  /** Minutes since the alert. */
  m: number
  ph: EmPhase
  lv: EmLevel
  flash?: 1
  yn?: 1
  listen?: 1
}

export interface EmStepScreen {
  q: string
  small?: string
  flash?: 1
  yn?: 1
  listen?: 1
  help?: string
}

/** A step with its text in the current language (see `emSteps`). */
export interface EmStep {
  t: string
  m: number
  ph: string
  d: string
  s: string
  lv: string
  /** [title, subtitle, ETA]; a `null` entry keeps the previous value. */
  own?: readonly [string | null, string | null, string | null]
  what?: string
  sub?: string
  /** What Margaret's screen shows. */
  e: EmStepScreen
}

/** The ten steps' structure; `STEPS[i].t` and `STEPS.length` are language-free. */
export const STEPS: readonly EmFrame[] = [
  { t: '02:03', m: 0, ph: 'verify', lv: 'checking', flash: 1 },
  { t: '02:04', m: 1, ph: 'ask', lv: 'checking', yn: 1 },
  { t: '02:04', m: 1, ph: 'ask', lv: 'checking', listen: 1 },
  { t: '02:04', m: 1, ph: 'triage', lv: 'emergency' },
  { t: '02:04', m: 1, ph: 'escalate', lv: 'emergency' },
  { t: '02:05', m: 2, ph: 'escalate', lv: 'emergency' },
  { t: '02:06', m: 3, ph: 'escalate', lv: 'emergency' },
  { t: '02:07', m: 4, ph: 'handOff', lv: 'emergency' },
  { t: '02:11', m: 8, ph: 'escalate', lv: 'emergency' },
  { t: '02:21', m: 18, ph: 'handOff', lv: 'helpArrived' },
]

const opt = (v: string) => v || undefined

/** The steps with their text in the current language. Call at render time; never cache across a language change. */
export function emSteps(): EmStep[] {
  const text = i18n.t('live:steps', { returnObjects: true })
  return STEPS.map((f, i) => {
    const x = text[i]
    const own = x.own.some(Boolean) ? (x.own.map((v) => v || null) as [string | null, string | null, string | null]) : undefined
    return {
      t: f.t,
      m: f.m,
      ph: i18n.t(`live:phase.${f.ph}`),
      d: x.d,
      s: x.s,
      lv: i18n.t(`live:level.${f.lv}`),
      own,
      what: opt(x.what),
      sub: opt(x.sub),
      e: { q: x.q, small: opt(x.small), flash: f.flash, yn: f.yn, listen: f.listen, help: opt(x.help) },
    }
  })
}

/** `APP` (line 1568): how far the ambulance has come, per step. */
export const APP_PROGRESS: readonly number[] = [0, 0, 0, 0, 0, 0.12, 0.32, 0.58, 1, 1]

type SlaId = 'verified' | 'escalated' | 'accepted' | 'atDoor' | 'edNotice'
type SlaValue = { sec: number } | { min: number } | string

/** `SLA` (line 1568): label id, time, and the step at which it is reached. */
const SLA_FRAMES: readonly (readonly [id: SlaId, value: SlaValue, step: number])[] = [
  ['verified', { sec: 41 }, 1],
  ['escalated', { sec: 58 }, 4],
  ['accepted', '1:12', 5],
  ['atDoor', { min: 8 }, 8],
  ['edNotice', { min: 14 }, 9],
]

const slaValue = (v: SlaValue) =>
  typeof v === 'string' ? v : 'sec' in v ? i18n.t('live:units.sec', { n: v.sec }) : i18n.t('live:units.min', { n: v.min })

/** The response-time tiles in the current language: label, time, and the step at which it is reached. */
export function slaTiles(): [label: string, value: string, step: number][] {
  return SLA_FRAMES.map(([id, v, step]) => [i18n.t(`live:sla.${id}`), slaValue(v), step])
}

/** Milliseconds per step while playing (prototype `setInterval`, 2800). */
export const TICK_MS = 2800

/** From this step (02:07) the hospital has the packet: Pre-arrivals shows "1 new". */
export const PACKET_STEP = 7

export interface EmState {
  active: boolean
  step: number
  playing: boolean
}

export type EmAction =
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'tick' }
  | { type: 'goto'; step: number }

export const EM_INITIAL: EmState = { active: false, step: 0, playing: false }

const LAST = STEPS.length - 1
const clamp = (n: number) => Math.min(LAST, Math.max(0, Math.trunc(n)))

export function emergencyReducer(s: EmState, a: EmAction): EmState {
  if (a.type === 'start') return { active: true, step: 0, playing: true }
  if (a.type === 'end') return EM_INITIAL
  if (!s.active) return s
  switch (a.type) {
    case 'tick': {
      if (!s.playing) return s
      const step = clamp(s.step + 1)
      return { ...s, step, playing: step < LAST }
    }
    case 'next': return { ...s, step: clamp(s.step + 1), playing: false }
    case 'prev': return { ...s, step: clamp(s.step - 1), playing: false }
    case 'goto': return { ...s, step: clamp(a.step), playing: false }
    case 'pause': return { ...s, playing: false }
    case 'play': return s.step === LAST ? { ...s, step: 0, playing: true } : { ...s, playing: true }
  }
}

/** True once the hospital has Margaret's packet (step 02:07 onwards of a running demo). */
export const packetArrived = (s: EmState): boolean => s.active && s.step >= PACKET_STEP

export interface StepView {
  own: [string, string, string]
  what: string
  sub: string
  help: string | null
}

/** `renderEm` (line 1570): owner, headline and help carry forward from earlier steps; `null` keeps the old value. */
export function resolveStepView(steps: readonly EmStep[], i: number): StepView {
  const own: [string, string, string] = [...(steps[0].own as [string, string, string])]
  let what = steps[0].what ?? ''
  let sub = steps[0].sub ?? ''
  let help: string | null = null
  for (let j = 0; j <= i; j++) {
    const st = steps[j]
    st.own?.forEach((v, k) => { if (v !== null) own[k] = v })
    if (st.what) what = st.what
    if (st.sub) sub = st.sub
    if (st.e.help) help = st.e.help
  }
  return { own, what, sub, help }
}

export interface EmOrbitTargets {
  mode: 'check' | 'sos'
  app: number
  call: number
  hosp: number
  arrived: number
}

/** `orbEm.set(...)` (line 1578): the prototype's Orbit modes, not an `emergency` mode (ruling R14). */
export function orbitTargets(i: number): EmOrbitTargets {
  return {
    mode: i >= 3 ? 'sos' : 'check',
    app: APP_PROGRESS[i],
    call: i >= 6 ? 1 : i >= 4 ? 0.35 : 0,
    hosp: i >= 7 ? 1 : 0,
    arrived: i >= 8 ? 1 : 0,
  }
}
