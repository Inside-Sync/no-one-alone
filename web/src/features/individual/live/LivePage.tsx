'use client'

import { useEffect } from 'react'
import { getOrbitScene } from '@/data/repo'
import { useRepo } from '@/features/shared/useRepo'
import { STEPS } from '@/domain/emergency'
import { useAppState } from '@/state/AppState'
import { AlertCard } from './AlertCard'
import { IdleCard } from './IdleCard'
import { PhoneCard } from './PhoneCard'
import { TimelineCard } from './TimelineCard'

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Prototype `renderEm`: the screen-wide flash on a new alert. Both timers are cleared on unmount. */
function useFlash(on: boolean) {
  useEffect(() => {
    const f = document.getElementById('flash')
    if (!on || !f) return
    f.style.transition = 'none'
    f.style.opacity = reducedMotion() ? '0.5' : '1'
    const fade = setTimeout(() => {
      f.style.transition = 'opacity 1.6s'
      f.style.opacity = '0'
    }, 120)
    return () => {
      clearTimeout(fade)
      f.style.transition = 'none'
      f.style.opacity = '0'
    }
  }, [on])
}

/**
 * Individual view · Emergency (`<main data-page="live">`). Safety is the one category that is
 * never locked, so nothing here is wrapped in `<Locked>`: the demo runs while sharing is paused.
 */
export function LivePage() {
  const { emergency, dispatchEmergency, setWho } = useAppState()
  // Never gate the page on the scene (Task 10): on failure the canvas area stays empty and the safety controls,
  // which do not depend on it, keep working. So there is deliberately no PageError here.
  const scene = useRepo(getOrbitScene).data
  const { active, step, playing } = emergency
  useFlash(active && Boolean(STEPS[step].e.flash))

  if (!active) {
    // The demo always runs in the family view (prototype line 2016).
    return (
      <main className="grid" data-page="live">
        <IdleCard onRun={() => { setWho('family'); dispatchEmergency({ type: 'start' }) }} />
      </main>
    )
  }
  return (
    <main className="grid" data-page="live">
      <AlertCard step={step} scene={scene} onEnd={() => dispatchEmergency({ type: 'end' })} />
      <TimelineCard
        step={step}
        playing={playing}
        onPrev={() => dispatchEmergency({ type: 'prev' })}
        onNext={() => dispatchEmergency({ type: 'next' })}
        onTogglePlay={() => dispatchEmergency({ type: playing ? 'pause' : 'play' })}
      />
      <PhoneCard step={step} />
    </main>
  )
}
