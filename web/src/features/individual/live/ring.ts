/** One key per call to a nearby member (`NOTIFIED` "Calling ...") or to the emergency number, so each call rings once. */
export function callKeys(timeline: readonly { at: string; kind: string; text: string }[], incidentId = ''): string[] {
  return timeline.filter(isCall).map((e) => callKey(e, incidentId))
}

const isCall = (e: { kind: string; text: string }) => (e.kind === 'NOTIFIED' || e.kind === 'CALLED_115') && e.text.startsWith('Calling ')
// Story time restarts each demo run, so the incident id keeps a second run's calls new.
const callKey = (e: { at: string; text: string }, incidentId: string) => `${incidentId ? incidentId + ' ' : ''}${e.at} ${e.text}`

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

/** A tone of one or more frequencies; no frequencies is silence. */
export interface Tone { freqs: number[]; ms: number }

const RING_HZ = [400, 450]
const ZERO_HZ = [941, 1336]
const ringTones = (totalMs: number): Tone[] => ringPattern(totalMs).map((s) => ({ freqs: s.on ? RING_HZ : [], ms: s.ms }))

/** Dialling 000 by keypad (DTMF "0" three times), a short pause, then the ring for `ringMs`. */
export function dialSequence(ringMs: number): Tone[] {
  const zero = { freqs: ZERO_HZ, ms: 180 }
  const gap = { freqs: [], ms: 120 }
  return [zero, gap, zero, gap, zero, { freqs: [], ms: 700 }, ...ringTones(ringMs)]
}

/** Plays tones with Web Audio; resolves when done, or at once when audio is unavailable. */
function playTones(tones: Tone[]): Promise<void> {
  try {
    const ctx = new AudioContext()
    let t = ctx.currentTime
    for (const tone of tones) {
      const end = t + tone.ms / 1000
      if (tone.freqs.length) {
        const gain = ctx.createGain()
        gain.gain.value = 0
        gain.gain.setTargetAtTime(0.15, t, 0.01)
        gain.gain.setTargetAtTime(0, end - 0.03, 0.01)
        gain.connect(ctx.destination)
        for (const f of tone.freqs) {
          const osc = ctx.createOscillator()
          osc.frequency.value = f
          osc.connect(gain)
          osc.start(t)
          osc.stop(end + 0.05)
        }
      }
      t = end
    }
    const totalMs = tones.reduce((a, x) => a + x.ms, 0)
    return new Promise((resolve) => setTimeout(() => { void ctx.close().catch(() => {}); resolve() }, totalMs))
  } catch {
    return Promise.resolve()
  }
}

/** Plays the Australian ring (400 Hz + 450 Hz). */
export const playRing = (totalMs = 4000) => playTones(ringTones(totalMs))

/** Plays the keypad dialling 000, then the ring. */
export const playDial000 = () => playTones(dialSequence(6000))

/** Which sound the newest calls need: `dial` when one of them is the automatic emergency call. Adds them to `seen`. */
export function freshCallSound(timeline: readonly { at: string; kind: string; text: string }[], seen: Set<string>, incidentId = ''): 'dial' | 'ring' | null {
  const fresh = timeline.filter((e) => isCall(e) && !seen.has(callKey(e, incidentId)))
  fresh.forEach((e) => seen.add(callKey(e, incidentId)))
  if (!fresh.length) return null
  return fresh.some((e) => e.kind === 'CALLED_115') ? 'dial' : 'ring'
}
