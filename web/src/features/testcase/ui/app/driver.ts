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

/** How fast "Run it for me" and the Judge path go: a multiplier on every delay between two actions and on the dwell between cases. */
export type Speed = 'slow' | 'normal' | 'fast'
export const SPEEDS: readonly Speed[] = ['slow', 'normal', 'fast']
export const SPEED_MULT: Record<Speed, number> = { slow: 2, normal: 1, fast: 0.5 }
export const DEFAULT_SPEED: Speed = 'slow'

export interface DriverOptions {
  /** The speed to start at (default `slow`, suitable for presenting). */
  speed?: Speed
  /** Called when pause or speed changes. */
  onPlayback?: () => void
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
  private _paused = false
  private _speed: Speed

  constructor(private e: TestCaseEngine, private o: DriverOptions) {
    this._speed = o.speed ?? DEFAULT_SPEED
    this.unsub = e.subscribe(this.sync)
    this.sync()
  }

  get judging() { return this.judge }
  get paused() { return this._paused }
  get speed() { return this._speed }

  private pace() { return (this.judge ? JUDGE_PACE : 1) * SPEED_MULT[this._speed] }

  private sync = () => {
    if (this.dead) return
    if (!this.ownTick) this.otherEmit = true
    const S = this.e.S
    const playing = S.phase === 'playing'
    const busy = this.e.busy
    if (this._paused) {
      if (this.playI) { clearInterval(this.playI); this.playI = undefined }
      if (this.flowI) { clearInterval(this.flowI); this.flowI = undefined }
      if (this.autoT) { clearTimeout(this.autoT); this.autoT = undefined }
      return
    }
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
    if (!this.dead && !this._paused && this.e.S.auto) this.autoT = setTimeout(this.loop, this.o.reduced ? Math.min(d, REDUCED_STEP_MS) : Math.round(d * this.pace()))
  }

  private autoEnded() {
    const j = this.judge
    if (!j) return
    const next = j.beat + 1
    if (next >= j.total) { this.setJudge({ ...j, phase: 'done' }); return }
    this.setJudge({ ...j, phase: 'pause' })
    this.scheduleBeat()
  }

  /** The pause between two cases of the Judge path: after it, the next case starts (not while paused: resume schedules it again). */
  private scheduleBeat() {
    if (this.beatT) { clearTimeout(this.beatT); this.beatT = undefined }
    if (this._paused || !this.judge) return
    this.beatT = setTimeout(() => {
      this.beatT = undefined
      this.startBeat()
    }, this.o.reduced ? REDUCED_STEP_MS : Math.round(JUDGE_PAUSE_MS * SPEED_MULT[this._speed]))
  }

  private startBeat() {
    const j = this.judge
    if (this.dead || !j) return
    const next = j.beat + 1
    if (next >= j.total) return
    this.setJudge({ beat: next, total: j.total, phase: 'running' })
    this.e.restart(JUDGE_BEATS[next])
    this.o.onCase?.(JUDGE_BEATS[next])
    this.e.setAuto(true)
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
    if (this._paused) this.setPaused(false)
    if (this.beatT) { clearTimeout(this.beatT); this.beatT = undefined }
    if (this.autoT) { clearTimeout(this.autoT); this.autoT = undefined }
    if (this.judge) this.setJudge(null)
    if (this.e.S.auto) this.e.setAuto(false)
  }

  private setPaused(on: boolean) {
    if (this._paused === on) return
    this._paused = on
    this.e.paused = on
    this.o.onPlayback?.()
  }

  /** Whether a run is going: "Run it for me" or the Judge path is on or between two cases, or it is paused. */
  get active() { return this._paused || this.e.S.auto || (!!this.judge && this.judge.phase !== 'done') }

  /** Nothing advances while paused (autopilot, sensor playback, pipeline animation, the pause between cases). */
  pause() {
    if (this._paused || !this.active) return
    this.setPaused(true)
    if (this.beatT) { clearTimeout(this.beatT); this.beatT = undefined }
    this.sync()
  }

  /** Continue where it stopped. */
  resume() {
    if (!this._paused) return
    this.setPaused(false)
    this.sync()
    if (this.judge?.phase === 'pause') this.scheduleBeat()
  }

  setSpeed(s: Speed) {
    if (this._speed === s) return
    this._speed = s
    this.o.onPlayback?.()
  }

  /**
   * Finish what is moving and go on to the next step now (the next case when this is the last step of one on the Judge path).
   * Keeps the paused or playing state.
   */
  skip() {
    if (this.dead || !this.active) return
    const e = this.e
    if (this.judge?.phase === 'pause') { if (this.beatT) { clearTimeout(this.beatT); this.beatT = undefined } this.startBeat(); return }
    if (!e.S.auto) return
    e.drain()
    const from = e.S.step
    let ended = false
    for (let n = 0; n < 300; n++) {
      if (e.autoStep() == null) { ended = true; break }
      e.drain()
      if (e.S.step !== from) break
    }
    if (ended) {
      const j = this.judge
      if (j && j.beat + 1 < j.total) { this.setJudge({ ...j, phase: 'pause' }); this.startBeat() }
      else if (j) this.setJudge({ ...j, phase: 'done' })
    }
  }

  /**
   * The previous step, with exactly the state a normal run had on arriving there: the engine is deterministic, so the case is loaded
   * again with the same details and played forward without animation up to that step. On the first step of a case on the Judge path it
   * is the end of the case before. Ends paused.
   */
  back() {
    if (this.dead || !this.active) return
    const e = this.e
    this.setPaused(true)
    for (const t of [this.beatT, this.autoT]) if (t) clearTimeout(t)
    this.beatT = this.autoT = undefined
    const j = this.judge
    let ck = e.S.ck
    let target: number | 'last' = j?.phase === 'pause' ? 'last' : e.S.step - 1
    if (j?.phase === 'pause') {
      this.setJudge({ ...j, phase: 'running' })
    } else if (typeof target === 'number' && target < 0) {
      target = 0
      if (j && j.beat > 0) {
        ck = JUDGE_BEATS[j.beat - 1]
        target = 'last'
        this.setJudge({ ...j, beat: j.beat - 1, phase: 'running' })
        this.o.onCase?.(ck)
      }
    }
    if (ck !== e.S.ck) e.restart(ck)
    else e.replay()
    e.setAuto(true)
    for (let n = 0; n < 2000; n++) {
      e.drain()
      if (target !== 'last' && e.S.step === target) break
      if (e.autoStep() == null) break
    }
    e.drain()
    if (!e.S.auto) e.setAuto(true)
    this.sync()
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
