/** One key per call to a nearby member (`NOTIFIED` "Calling ..."), so each call rings once. */
export function callKeys(timeline: readonly { at: string; kind: string; text: string }[]): string[] {
  return timeline.filter((e) => e.kind === 'NOTIFIED' && e.text.startsWith('Calling ')).map((e) => `${e.at} ${e.text}`)
}

export interface RingSegment { on: boolean; ms: number }

/** Australian ring: 400 ms on, 200 off, 400 on, 2000 off, repeated and cut at `totalMs`. */
export function ringPattern(totalMs: number): RingSegment[] {
  const cycle: RingSegment[] = [{ on: true, ms: 400 }, { on: false, ms: 200 }, { on: true, ms: 400 }, { on: false, ms: 2000 }]
  const out: RingSegment[] = []
  let left = totalMs
  for (let i = 0; left > 0; i++) {
    const seg = cycle[i % cycle.length]
    out.push({ on: seg.on, ms: Math.min(seg.ms, left) })
    left -= seg.ms
  }
  return out
}

/** Plays the ring with Web Audio (400 Hz + 450 Hz); resolves when done, or at once when audio is unavailable. */
export function playRing(totalMs = 4000): Promise<void> {
  try {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(ctx.destination)
    for (const f of [400, 450]) {
      const osc = ctx.createOscillator()
      osc.frequency.value = f
      osc.connect(gain)
      osc.start()
      osc.stop(ctx.currentTime + totalMs / 1000)
    }
    let t = ctx.currentTime
    for (const seg of ringPattern(totalMs)) {
      if (seg.on) {
        gain.gain.setTargetAtTime(0.15, t, 0.01)
        gain.gain.setTargetAtTime(0, t + seg.ms / 1000 - 0.03, 0.01)
      }
      t += seg.ms / 1000
    }
    return new Promise((resolve) => setTimeout(() => { void ctx.close().catch(() => {}); resolve() }, totalMs))
  } catch {
    return Promise.resolve()
  }
}
