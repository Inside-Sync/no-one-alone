import { useCallback, useEffect, useRef, useState } from 'react'
import { SCENARIOS, runAll, type ScenarioResult } from '../../bench'

export type RunState = 'idle' | 'running' | 'done' | 'cancelled'
export interface BenchRun {
  state: RunState
  results: ScenarioResult[] | null
  done: number
  total: number
  start: () => void
  cancel: () => void
}

/**
 * Runs the whole benchmark in the browser, in chunks, and keeps the results. Held by the app (not the tab) so the numbers survive a
 * switch to another tab; a run in progress is cancelled when the overlay closes.
 */
export function useBenchRun(): BenchRun {
  const [results, setResults] = useState<ScenarioResult[] | null>(null)
  const [state, setState] = useState<RunState>('idle')
  const [done, setDone] = useState(0)
  /** The id of the run that is current. A cancelled or replaced run sees another id and stops, so it can neither resume nor overwrite a newer run. */
  const runId = useRef(0)
  /** The run the person asked to cancel: it finishes with the partial results it has. */
  const stopped = useRef(0)
  useEffect(() => {
    return () => { runId.current++ }
  }, [])

  const start = useCallback(() => {
    const id = ++runId.current
    const current = () => runId.current === id
    setState('running')
    setResults(null)
    setDone(0)
    runAll(SCENARIOS, {
      onProgress: (n) => { if (current()) setDone(n) },
      isCancelled: () => !current() || stopped.current === id,
    }).then((out) => {
      if (!current()) return
      setResults(out.results)
      setDone(out.results.length)
      setState(out.cancelled ? 'cancelled' : 'done')
    }).catch(() => {
      if (current()) setState('cancelled')
    })
  }, [])
  const cancel = useCallback(() => { stopped.current = runId.current }, [])
  return { state, results, done, total: SCENARIOS.length, start, cancel }
}
