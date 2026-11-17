'use client'

import { useCallback } from 'react'
import { usePathname, useRouter } from '@/app/navigation'
import { parsePath } from '@/domain/views'
import { NIGHT_DEMO_PATH, startNightDemo, stopNightDemo } from '@/features/individual/live/nightDemo'
import { useAppState } from './AppState'
import { useLiveIncident } from './LiveIncident'

/**
 * The Night alert demo, shared by the top bar switch and the walkthrough's Play button.
 * `start` follows the prototype's startEm: the family view in the mock, Moza's own view when a real scenario runs through
 * core-api; `stop` goes back to the day sky with nothing running.
 */
export function useNightDemo() {
  const router = useRouter()
  const { view, page } = parsePath(usePathname())
  const { setWho, dispatchEmergency, holdNight, night } = useAppState()
  const { live, reset } = useLiveIncident()
  const onLive = view === 'individual' && page === 'live'

  const stop = useCallback(() => {
    // The Emergency page on screen also resets its watch.
    if (!live) dispatchEmergency({ type: 'end' })
    else {
      holdNight(false)
      if (onLive) stopNightDemo()
      else reset().catch(() => {})
    }
  }, [live, onLive, dispatchEmergency, holdNight, reset])

  const start = useCallback(() => {
    setWho(live ? 'self' : 'family')
    if (!live) dispatchEmergency({ type: 'start' })
    else holdNight(true)
    // Already on the Emergency page: the URL does not remount it, so the event starts the demo there.
    if (live && onLive) startNightDemo()
    else router.push(live ? NIGHT_DEMO_PATH : '/individual/live')
  }, [live, onLive, setWho, dispatchEmergency, holdNight, router])

  return { night, start, stop, toggle: () => (night ? stop() : start()) }
}
