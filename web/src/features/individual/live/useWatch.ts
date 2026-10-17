import { useCallback, useEffect, useRef, useState } from 'react'
import { ALERT_MIN, PRESETS, alertRun, blankWatch, setHr as withHr, setStill as withStill, tick, type PresetId, type Watch } from '@/domain/simulator'

/** The Simulator's live watch: one reading per tick, and `onAlert` once per armed watch when the rule is met. */
export function useWatch({ locked, onAlert }: { locked: boolean; onAlert: (w: Watch) => void }) {
  const [watch, setWatch] = useState(blankWatch)
  const [running, setRunning] = useState(true)
  const [fast, setFast] = useState(false)
  const [armed, setArmed] = useState(true)
  const [preset, setPreset] = useState<PresetId | null>(null)
  const latest = useRef({ locked, onAlert })
  useEffect(() => { latest.current = { locked, onAlert } })
  const ref = useRef({ watch, armed: true, running: true })

  const run = useCallback((on: boolean) => { ref.current.running = on; setRunning(on) }, [])
  // A failed start leaves the watch disarmed and paused; a preset, a slider or Reset arms it again.
  const commit = useCallback((next: Watch) => {
    ref.current.watch = next
    setWatch(next)
    if (!ref.current.armed || latest.current.locked || alertRun(next.readings) < ALERT_MIN) return
    ref.current.armed = false
    setArmed(false)
    run(false)
    latest.current.onAlert(next)
  }, [run])
  const rearm = useCallback((next: Watch) => {
    ref.current.armed = true
    setArmed(true)
    run(true)
    commit(next)
  }, [commit, run])

  useEffect(() => {
    if (!running || locked) return
    const id = setInterval(() => { if (ref.current.running) commit(tick(ref.current.watch)) }, fast ? 250 : 1000)
    return () => clearInterval(id)
  }, [running, locked, fast, commit])

  const slide = (apply: (w: Watch) => Watch) => {
    setPreset(null)
    if (ref.current.armed) commit(apply(ref.current.watch))
    else rearm(apply(blankWatch()))
  }
  return {
    watch, running, fast, armed, preset,
    toggleRun: () => run(!ref.current.running),
    toggleFast: () => setFast((f) => !f),
    loadPreset: (id: PresetId) => { setPreset(id); rearm(PRESETS[id]()) },
    setHr: (n: number) => slide((w) => withHr(w, n)),
    setStill: (n: number) => slide((w) => withStill(w, n)),
    reset: () => { setPreset(null); rearm(blankWatch()) },
  }
}

export type WatchApi = ReturnType<typeof useWatch>
