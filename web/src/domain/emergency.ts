/** The 02:03 night alert demo: the script (prototype `STEPS`, line 1558) and its player. Pure; no React. */

export interface EmStepScreen {
  q: string
  small?: string
  flash?: 1
  yn?: 1
  listen?: 1
  help?: string
}

export interface EmStep {
  /** Clock time on the timeline. */
  t: string
  /** Minutes since the alert. */
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

export const STEPS: readonly EmStep[] = [
  { t: '02:03', m: 0, ph: 'Verify', d: 'Heart rate 142, no movement for 4 min', s: 'Night baseline 61. Not explained by activity.', lv: 'Checking', own: ['David · not yet alerted', '450 m away · first to call', '—'], what: 'Heart rate 142, not moving', sub: 'The agent is checking before waking anyone', e: { q: 'Margaret…', small: 'Phone rings, screen flashes', flash: 1 } },
  { t: '02:04', m: 1, ph: 'Ask', d: 'Calls Margaret by voice. She answers slowly', s: 'Large-text questions on her screen too', lv: 'Checking', what: 'Answering slowly', sub: 'The agent is talking with her now', e: { q: "Margaret, it's your check-in. Can you hear me?", yn: 1 } },
  { t: '02:04', m: 1, ph: 'Ask', d: 'Repeat-after-me check: speech is slurred', s: 'Articulation score 0.41 (baseline 0.94)', lv: 'Checking', what: 'Slurred speech', sub: 'Possible stroke sign', e: { q: 'Please say after me: "The sky is blue in Sydney."', listen: 1 } },
  { t: '02:04', m: 1, ph: 'Triage', d: 'Level: emergency now', s: 'Last known well 01:55', lv: 'Emergency now', what: 'Suspected stroke signs', sub: 'Last known well 01:55', e: { q: "Sit still, love. Don't try to stand up." } },
  { t: '02:04', m: 1, ph: 'Escalate', d: 'David and you are alerted', s: 'Sarah in London gets updates', lv: 'Emergency now', own: ['David · alerted', 'Waiting for him to accept', '5:00'], e: { q: "I've called David." } },
  { t: '02:05', m: 2, ph: 'Escalate', d: 'David: "I\'m on my way"', s: 'He owns the case. Everyone sees it.', lv: 'Emergency now', own: ['David · on his way', 'Owns the case', '6′'], e: { q: 'David is on his way.', help: 'David · 6 min away' } },
  { t: '02:06', m: 3, ph: 'Escalate', d: 'You call 000 with the prepared script', s: 'Address, age, symptoms, medicines, access', lv: 'Emergency now', own: [null, null, '5′'], e: { q: 'James is calling an ambulance.', help: 'David · 5 min away' } },
  { t: '02:07', m: 4, ph: 'Hand off', d: 'Camperdown Stroke Centre received her record', s: 'Chosen for 24/7 stroke care · 11 min', lv: 'Emergency now', own: [null, null, '4′'], e: { q: 'The hospital has your details.', help: 'David · 4 min away' } },
  { t: '02:11', m: 8, ph: 'Escalate', d: 'David is with Margaret', s: 'Door unlocked, she is sitting, alert', lv: 'Emergency now', own: ['David · with Margaret', 'On scene since 02:11', '✓'], what: 'David is with her', sub: 'Ambulance on the way', e: { q: 'David is here, love.', help: 'David is with you' } },
  { t: '02:21', m: 18, ph: 'Hand off', d: 'Ambulance arrives · stroke team ready', s: 'ED read the packet 14 min before arrival', lv: 'Help arrived', what: 'On the way to Camperdown', sub: '30-day recovery plan starts after discharge', e: { q: "The ambulance is here. You're in good hands.", help: 'David is going with you' } },
]

/** `APP` (line 1568): how far the ambulance has come, per step. */
export const APP_PROGRESS: readonly number[] = [0, 0, 0, 0, 0, 0.12, 0.32, 0.58, 1, 1]

/** `SLA` (line 1568): label, time, and the step at which it is reached. */
export const SLA: readonly (readonly [label: string, value: string, step: number])[] = [
  ['Alert → verified', '41 s', 1],
  ['Verified → escalated', '58 s', 4],
  ['Accepted', '1:12', 5],
  ['At the door', '8 min', 8],
  ['ED notice before arrival', '14 min', 9],
]

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
