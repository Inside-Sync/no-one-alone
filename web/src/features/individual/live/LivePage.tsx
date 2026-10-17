'use client'

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getOrbitScene } from '@/data/repo'
import { PageError } from '@/features/shared/PageError'
import { useRepo } from '@/features/shared/useRepo'
import { STEPS } from '@/domain/emergency'
import { useToast } from '@/components/ui/Toast'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import { AlertCard } from './AlertCard'
import { IdleCard } from './IdleCard'
import { LiveAlertCard } from './LiveAlertCard'
import { LiveIdleCard } from './LiveIdleCard'
import { LivePhoneCard } from './LivePhoneCard'
import { LiveTimelineCard } from './LiveTimelineCard'
import { callKeys, playRing } from './ring'
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

/** Rings once for each new call to a nearby member; calls already on the timeline at load stay silent. */
function useCallRing(timeline: readonly { at: string; kind: string; text: string }[] | undefined) {
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    const keys = callKeys(timeline ?? [])
    if (seen.current === null) { seen.current = new Set(keys); return }
    const fresh = keys.filter((k) => !seen.current!.has(k))
    fresh.forEach((k) => seen.current!.add(k))
    if (fresh.length) void playRing(3000)
  }, [timeline])
}

/**
 * Individual view · Emergency (`<main data-page="live">`). Safety is the one category that is
 * never locked, so nothing here is wrapped in `<Locked>`: the demo runs while sharing is paused.
 */
export function LivePage() {
  return useLiveIncident().live ? <LiveIncidentPage /> : <ScriptedLivePage />
}

/**
 * VITE_DATA_SOURCE=firebase: the same layout driven by `demo/current` → `incidents/{id}`; every button posts to
 * core-api and the result comes back through Firestore. A closed incident stays on screen until the next start.
 */
function LiveIncidentPage() {
  const toast = useToast()
  const { viewer } = useAppState()
  const { loading, error, incident, people, view, start, reset, checkin, act } = useLiveIncident()
  const scene = useRepo(getOrbitScene).data
  useFlash(Boolean(view?.phone.flash))
  useCallRing(incident?.timeline)
  const { t } = useTranslation('live')
  const onReset = () => { reset().then(() => toast(t('live.resetDone')), () => toast(t('live.failed'))) }

  if (error) return <PageError page="live" onRetry={() => location.reload()} />
  if (loading) return <main className="grid" data-page="live"><p className="fine c12">{t('live.loading')}</p></main>
  if (!incident || !view) {
    return <main className="grid" data-page="live"><LiveIdleCard title={t('idle.title')} start={start} onReset={onReset} /></main>
  }
  return (
    <main className="grid" data-page="live">
      {!view.open && <LiveIdleCard title={t('live.closedTitle')} start={start} onReset={onReset} />}
      <LiveAlertCard view={view} incident={incident} people={people} scene={scene} viewer={viewer} act={act} onReset={onReset} />
      <LiveTimelineCard view={view} />
      <LivePhoneCard phone={view.phone} helpInitials={view.owner.initials} checkin={checkin} />
    </main>
  )
}

/** Mock mode: the prototype's scripted 02:03 demo. */
function ScriptedLivePage() {
  const { emergency, dispatchEmergency, setWho } = useAppState()
  // Never gate the page on the scene (Task 10): on failure the canvas area stays empty and the safety controls,
  // which do not depend on it, keep working. So there is deliberately no PageError here.
  const scene = useRepo(getOrbitScene).data
  const { active, step, playing } = emergency
  useFlash(active && Boolean(STEPS[step].flash))

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
