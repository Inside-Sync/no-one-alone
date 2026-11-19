'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useA } from './parts'
import { scrollSoon, scrollToTarget, scrollTopSoon, watchManualScroll } from './scrollTo'
import { useToast } from './toast'
import type { TestCaseSession } from './useTestCaseEngine'

/**
 * The session with the screen movement that goes with each button: the picker goes to the case header, "Run it for me" and the Judge
 * path follow the step card (until the person scrolls by hand), "Replay with the same readings" goes to the first step, Restart to the top.
 * Everything else about the session is the engine's.
 */
export function useUxSession(base: TestCaseSession): TestCaseSession {
  const t = useA()
  const toast = useToast()
  const follow = useRef(false)
  const cancels = useRef(new Set<() => void>())
  const keep = useCallback((cancel: () => void) => { cancels.current.add(cancel) }, [])
  useEffect(() => { const set = cancels.current; return () => { set.forEach((c) => c()); set.clear() } }, [])

  // A hand scroll ends the auto-follow until the next explicit action.
  useEffect(() => watchManualScroll(() => { follow.current = false }), [])

  // While a run is on and following: each new step (or the next beat's case) brings the step card into view. No focus move.
  const { step, ck, auto } = base.snap.state
  const seen = useRef(`${ck}:${step}`)
  useEffect(() => {
    const key = `${ck}:${step}`
    if (seen.current === key) return
    seen.current = key
    if (auto && follow.current) scrollToTarget('card')
  }, [ck, step, auto])

  const { engine, pick, restart, replay, toggleAuto, startJudge, stop, playback } = base
  return useMemo(() => ({
    ...base,
    pick: (id) => { follow.current = false; pick(id); keep(scrollSoon('caseHeader')) },
    restart: () => { follow.current = false; restart(); toast(t('toast.restart')); keep(scrollTopSoon()) },
    replay: () => { follow.current = false; replay(); toast(t('toast.replay')); keep(scrollSoon('card')) },
    toggleAuto: () => {
      const on = !engine.S.auto
      follow.current = on
      toggleAuto()
      if (on) keep(scrollSoon('card'))
    },
    startJudge: () => { follow.current = true; startJudge(); keep(scrollTopSoon()) },
    stop: () => { follow.current = false; stop() },
    // Back and Skip bring the step card into view, like Next does; Resume follows the run again.
    playback: {
      ...playback,
      resume: () => { follow.current = true; playback.resume() },
      toggle: () => { if (playback.paused) follow.current = true; playback.toggle() },
      back: () => { follow.current = true; playback.back(); keep(scrollSoon('card')) },
      skip: () => { follow.current = true; playback.skip(); keep(scrollSoon('card')) },
    },
  }), [base, engine, pick, restart, replay, toggleAuto, startJudge, stop, playback, keep, toast, t])
}
