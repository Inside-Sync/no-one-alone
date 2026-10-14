'use client'

import { useCallback, useEffect, useState, type DependencyList } from 'react'

export type RepoStatus = 'loading' | 'ready' | 'error'

export interface RepoResult<T> {
  status: RepoStatus
  /** The loaded value; null while loading or after a failure. */
  data: T | null
  error: unknown
  /** Runs the load again (the PageError "Try again" button). */
  retry: () => void
}

interface Snapshot<T> { status: RepoStatus; data: T | null; error: unknown }

const LOADING = { status: 'loading', data: null, error: null } as const

const sameDeps = (a: DependencyList, b: DependencyList) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]))

/**
 * One read through the repo, with an explicit error state (Final review, finding 3).
 * The load runs on mount, whenever `deps` change and on `retry()`; a result that arrives after unmount
 * or after a newer load has started is dropped. A failure never becomes an unhandled rejection.
 */
export function useRepo<T>(load: () => Promise<T>, deps: DependencyList = []): RepoResult<T> {
  const [snap, setSnap] = useState<Snapshot<T>>(LOADING)
  const [attempt, setAttempt] = useState(0)
  // New deps mean a new load: drop the old result during render (React's "adjust state on prop change" pattern),
  // so a stale value is never shown for the new deps.
  const [prevDeps, setPrevDeps] = useState(deps)
  if (!sameDeps(prevDeps, deps)) {
    setPrevDeps(deps)
    setSnap(LOADING)
  }

  useEffect(() => {
    let live = true
    // new Promise(...) also turns a synchronous throw inside `load` into a rejection.
    new Promise<T>((resolve) => resolve(load())).then(
      (data) => { if (live) setSnap({ status: 'ready', data, error: null }) },
      (error: unknown) => { if (live) setSnap({ status: 'error', data: null, error }) },
    )
    return () => { live = false }
    // `load` is usually an inline closure over `deps`; the caller lists what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const retry = useCallback(() => {
    setSnap(LOADING)
    setAttempt((n) => n + 1)
  }, [])
  return { ...snap, retry }
}
