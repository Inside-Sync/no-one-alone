import { vi } from 'vitest'
import { Driver, JUDGE_BEATS, type Speed } from '@/features/testcase/ui/app/driver'
import type { TestCaseEngine } from '@/features/testcase/engine'
import { make } from './helpers'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

const drv = (e: TestCaseEngine, speed: Speed = 'normal') => new Driver(e, { reduced: false, speed })
const fingerprint = (e: TestCaseEngine) => JSON.stringify({ s: e.getSnapshot().state, log: e.getSnapshot().log })
const untilStep = (e: TestCaseEngine, n: number, max = 400_000) => {
  let ms = 0
  while (e.S.step < n && ms < max) { vi.advanceTimersByTime(50); ms += 50 }
  return ms
}

describe('playback: pause, resume, back, skip, speed', () => {
  it('pause stops every timer, resume continues from the same place', () => {
    const e = make('stroke')
    const d = drv(e)
    d.setAuto(true)
    vi.advanceTimersByTime(4000)
    d.pause()
    expect(d.paused).toBe(true)
    expect(e.paused).toBe(true)
    const before = fingerprint(e)
    vi.advanceTimersByTime(120_000)
    expect(fingerprint(e)).toBe(before)
    d.resume()
    expect(e.paused).toBe(false)
    untilStep(e, 2)
    expect(e.S.step).toBeGreaterThanOrEqual(2)
    d.dispose()
  })

  it('pause also holds the sensor playback and the pipeline animation', () => {
    const e = make('stroke')
    const d = drv(e)
    d.setAuto(true)
    let n = 0
    while (e.S.phase !== 'playing' && n++ < 200) vi.advanceTimersByTime(50)
    expect(e.S.phase).toBe('playing')
    d.pause()
    const len = e.S.read.length
    vi.advanceTimersByTime(30_000)
    expect(e.S.read.length).toBe(len)
    d.resume()
    vi.advanceTimersByTime(3000)
    expect(e.S.read.length).toBeGreaterThan(len)
    d.dispose()
  })

  it('back reaches the previous step with exactly the state a normal run had there, and stays paused', () => {
    // The reference: the autopilot without timers, the state recorded on arriving at each step.
    const ref = make('family')
    const arrival = new Map<number, string>()
    ref.setAuto(true)
    for (let i = 0; i < 400; i++) {
      ref.drain()
      if (!arrival.has(ref.S.step)) arrival.set(ref.S.step, fingerprint(ref))
      if (ref.autoStep() == null) break
    }
    expect(arrival.size).toBeGreaterThan(3)
    const e = make('family')
    const d = drv(e)
    d.setAuto(true)
    untilStep(e, 3)
    d.pause()
    d.back()
    expect(e.S.step).toBe(2)
    expect(fingerprint(e)).toBe(arrival.get(2))
    expect(d.paused).toBe(true)
    const held = fingerprint(e)
    vi.advanceTimersByTime(60_000)
    expect(fingerprint(e)).toBe(held)
    d.back()
    expect(e.S.step).toBe(1)
    expect(fingerprint(e)).toBe(arrival.get(1))
    // And the run goes on from there once resumed.
    d.resume()
    untilStep(e, 3)
    expect(e.S.step).toBeGreaterThanOrEqual(3)
    d.dispose()
  })

  it('skip finishes the step and goes to the next one, keeping the paused state', () => {
    const e = make('stroke')
    const d = drv(e)
    d.setAuto(true)
    vi.advanceTimersByTime(500)
    d.pause()
    const from = e.S.step
    d.skip()
    expect(e.S.step).toBe(from + 1)
    expect(d.paused).toBe(true)
    d.skip()
    expect(e.S.step).toBe(from + 2)
    d.resume()
    d.skip()
    expect(e.S.step).toBe(from + 3)
    expect(d.paused).toBe(false)
    d.dispose()
  })

  it('speed scales the delay between two actions', () => {
    const t = {} as Record<Speed, number>
    for (const sp of ['slow', 'normal', 'fast'] as const) {
      const e = make('stroke')
      const d = drv(e, sp)
      d.setAuto(true)
      t[sp] = untilStep(e, 2)
      d.dispose()
    }
    expect(t.fast).toBeLessThan(t.normal)
    expect(t.normal).toBeLessThan(t.slow)
    // And it can be changed while running.
    const e = make('stroke')
    const d = drv(e, 'slow')
    d.setSpeed('fast')
    expect(d.speed).toBe('fast')
    d.dispose()
  })

  it('on the Judge path, back from a case\'s first step goes to the end of the case before; skip at the end starts the next case', () => {
    const e = make('stroke')
    const d = drv(e, 'fast')
    d.startJudge()
    expect(e.S.ck).toBe(JUDGE_BEATS[0])
    d.pause()
    d.skip()
    for (let i = 0; i < 40 && e.S.ck === JUDGE_BEATS[0]; i++) d.skip()
    expect(e.S.ck).toBe(JUDGE_BEATS[1])
    expect(e.S.step).toBe(0)
    expect(d.judging?.beat).toBe(1)
    expect(d.paused).toBe(true)
    d.back()
    expect(e.S.ck).toBe(JUDGE_BEATS[0])
    expect(d.judging?.beat).toBe(0)
    expect(e.S.step).toBeGreaterThan(0)
    expect(d.paused).toBe(true)
    d.dispose()
  })

  it('stopping the run clears the pause', () => {
    const e = make('stroke')
    const d = drv(e)
    d.setAuto(true)
    d.pause()
    d.stop()
    expect(d.paused).toBe(false)
    expect(e.paused).toBe(false)
    d.dispose()
  })
})
