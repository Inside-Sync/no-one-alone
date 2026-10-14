'use client'

import { useEffect, useState } from 'react'
import { getOrbitScene } from '@/data/repo'
import type { OrbitScene } from '@/data/types'
import { STEPS } from '@/domain/emergency'
import { useAppState } from '@/state/AppState'
import { AlertCard } from './AlertCard'
import { IdleCard } from './IdleCard'
import { PhoneCard } from './PhoneCard'
import { TimelineCard } from './TimelineCard'

function useOrbitScene(): OrbitScene | null {
  const [scene, setScene] = useState<OrbitScene | null>(null)
  useEffect(() => {
    let live = true
    // On failure the canvas area stays empty; the safety controls do not depend on it.
    getOrbitScene().then((s) => { if (live) setScene(s) }, () => {})
    return () => { live = false }
  }, [])
  return scene
}

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
  const scene = useOrbitScene()
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
