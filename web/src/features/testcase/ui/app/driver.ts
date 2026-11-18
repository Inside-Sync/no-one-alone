import type { CaseId, TestCaseEngine } from '../../engine'

/** The Judge path (plan Y6): wow first. Khalid's one-tap booking, then the family passport, then the stroke at night. */
export const JUDGE_BEATS: readonly CaseId[] = ['ifhas', 'family', 'stroke']

export interface JudgeState {
  /** Index into `JUDGE_BEATS` of the beat on screen. */
  beat: number
  total: number
  /** `running`: the beat plays; `pause`: it finished, the next one is about to start; `done`: the last beat finished. */
  phase: 'running' | 'pause' | 'done'
}

export interface DriverOptions {
  /** Reduced motion: no intervals, pending playback and pipeline animation run instantly, "Run it for me" steps every 150 ms at most. */
  reduced: boolean
  /** Called whenever the Judge path moves (or ends: null). */
  onJudge?: (s: JudgeState | null) => void
  /** Called when a beat of the Judge path loads its case. */
  onCase?: (c: CaseId) => void
}

export const PLAY_MS = 90
export const FLOW_MS = 220
export const FIRST_AUTO_MS = 300
/** The Judge path runs slower than "Run it for me" so a person can follow it: about three minutes in all. */
export const JUDGE_PACE = 1.9
export const JUDGE_PAUSE_MS = 5200
const REDUCED_STEP_MS = 150

/**
 * The three timers of the engine (the engine itself has none): the sensor playback every 90 ms while `phase === 'playing'`,
 * the pipeline animation every 220 ms while busy, and "Run it for me" (`autoStep()` returns the delay to its next call).
 * It watches the engine and starts and stops them as needed, so a case restarted or an autopilot stopped needs no extra call.
 * `dispose()` stops everything (the overlay closing); nothing outlives it.
 */
export class Driver {
  private playI?: ReturnType<typeof setInterval>
  private flowI?: ReturnType<typeof setInterval>
  private autoT?: ReturnType<typeof setTimeout>
  private beatT?: ReturnType<typeof setTimeout>
  private rmT?: ReturnType<typeof setTimeout>
  private looping = false
  /** Whether something else changed the engine since this timer's last beat: the step card (HomeCard) also drives the playback while it is mounted, so this timer only steps in when nothing else did. */
  private otherEmit = false
  private ownTick = false
  private dead = false
  private judge: JudgeState | null = null
  private unsub: () => void

  constructor(private e: TestCaseEngine, private o: DriverOptions) {
    this.unsub = e.subscribe(this.sync)
    this.sync()
  }

  get judging() { return this.judge }

  private pace() { return this.judge ? JUDGE_PACE : 1 }

  private sync = () => {
    if (this.dead) return
    if (!this.ownTick) this.otherEmit = true
    const S = this.e.S
    const playing = S.phase === 'playing'
    const busy = this.e.busy
    if (this.o.reduced) {
      if ((playing || busy) && !this.rmT) {
        this.rmT = setTimeout(() => { this.rmT = undefined; if (!this.dead) this.e.drain() }, 0)
      }
    } else {
      if (playing && !this.playI) this.playI = setInterval(() => { if (this.otherEmit) this.otherEmit = false; else { this.ownTick = true; try { this.e.playTick() } finally { this.ownTick = false } } }, PLAY_MS)
      else if (!playing && this.playI) { clearInterval(this.playI); this.playI = undefined }
      if (busy && !this.flowI) this.flowI = setInterval(() => { this.e.flowTick() }, FLOW_MS)
      else if (!busy && this.flowI) { clearInterval(this.flowI); this.flowI = undefined }
    }
    if (S.auto) {
      if (!this.autoT && !this.looping && !this.beatT) this.autoT = setTimeout(this.loop, this.o.reduced ? 0 : FIRST_AUTO_MS)
    } else if (this.autoT) { clearTimeout(this.autoT); this.autoT = undefined }
  }

  private loop = () => {
    this.autoT = undefined
    if (this.dead) return
    this.looping = true
    let d: number | null
    try { d = this.e.autoStep() } finally { this.looping = false }
    if (d == null) { this.autoEnded(); return }
    if (!this.dead && this.e.S.auto) this.autoT = setTimeout(this.loop, this.o.reduced ? Math.min(d, REDUCED_STEP_MS) : Math.round(d * this.pace()))
  }

  private autoEnded() {
    const j = this.judge
    if (!j) return
    const next = j.beat + 1
    if (next >= j.total) { this.setJudge({ ...j, phase: 'done' }); return }
    this.setJudge({ ...j, phase: 'pause' })
    this.beatT = setTimeout(() => {
      this.beatT = undefined
      if (this.dead || !this.judge) return
      this.setJudge({ beat: next, total: j.total, phase: 'running' })
      this.e.restart(JUDGE_BEATS[next])
      this.o.onCase?.(JUDGE_BEATS[next])
      this.e.setAuto(true)
    }, this.o.reduced ? REDUCED_STEP_MS : JUDGE_PAUSE_MS)
  }

  private setJudge(s: JudgeState | null) {
    this.judge = s
    this.o.onJudge?.(s)
  }

  /** "Run it for me" on or off. */
  setAuto(on: boolean) {
    if (!on) this.stop()
    else this.e.setAuto(true)
  }

  /** Start the Judge path from its first beat. */
  startJudge() {
    this.stop()
    this.setJudge({ beat: 0, total: JUDGE_BEATS.length, phase: 'running' })
    this.e.restart(JUDGE_BEATS[0])
    this.o.onCase?.(JUDGE_BEATS[0])
    this.e.setAuto(true)
  }

  /** Stop "Run it for me" and the Judge path (the case stays where it is). */
  stop() {
    if (this.beatT) { clearTimeout(this.beatT); this.beatT = undefined }
    if (this.autoT) { clearTimeout(this.autoT); this.autoT = undefined }
    if (this.judge) this.setJudge(null)
    if (this.e.S.auto) this.e.setAuto(false)
  }

  dispose() {
    this.dead = true
    this.unsub()
    for (const t of [this.autoT, this.beatT, this.rmT]) if (t) clearTimeout(t)
    if (this.playI) clearInterval(this.playI)
    if (this.flowI) clearInterval(this.flowI)
    this.autoT = this.beatT = this.rmT = undefined
    this.playI = this.flowI = undefined
  }
}
