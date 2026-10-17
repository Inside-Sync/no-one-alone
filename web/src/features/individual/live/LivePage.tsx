'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getOrbitScene } from '@/data/repo'
import { PageError } from '@/features/shared/PageError'
import { useRepo } from '@/features/shared/useRepo'
import { STEPS } from '@/domain/emergency'
import { presetSettings } from '@/domain/simulator'
import { useToast } from '@/components/ui/Toast'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import { AlertCard } from './AlertCard'
import { IdleCard } from './IdleCard'
import { LiveAlertCard } from './LiveAlertCard'
import { LivePhoneCard } from './LivePhoneCard'
import { LiveReadingsCard } from './LiveReadingsCard'
import { LiveTimelineCard } from './LiveTimelineCard'
import { callKeys, playRing } from './ring'
import { PhoneCard } from './PhoneCard'
import { SimulatorCard } from './SimulatorCard'
import { useAutopilot } from './useAutopilot'
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
  // Autopilot answers only for an incident this tab started from the Simulator.
  const [auto, setAuto] = useState(false)
  // questionKey is not incident-scoped, so a new run must forget the last one.
  const [spoken, setSpoken] = useState<string | null>(null)
  const onReset = () => { setAuto(false); setSpoken(null); reset().then(() => toast(t('live.resetDone')), () => toast(t('live.failed'))) }
  // Kept here, not in the cards, so the settings survive the incident they started.
  const [sim, setSim] = useState(() => presetSettings('night'))
  const open = Boolean(view?.open)
  const simStart: typeof start = async (s, o) => { setSpoken(null); await start(s, o); setAuto(true) }
  useAutopilot({ enabled: auto && open, settings: sim, incident, view, spokenKey: spoken, checkin, act })
  const simCards = (
    <>
      <SimulatorCard settings={sim} onChange={setSim} locked={open} start={simStart} onReset={onReset} />
      <LiveReadingsCard settings={sim} baseline={people.person?.baseline?.nightHr ?? 57} />
    </>
  )

  if (error) return <PageError page="live" onRetry={() => location.reload()} />
  if (loading) return <main className="grid" data-page="live"><p className="fine c12">{t('live.loading')}</p></main>
  if (!incident || !view) {
    return <main className="grid" data-page="live">{simCards}</main>
  }
  return (
    <main className="grid" data-page="live">
      {!open && simCards}
      <LiveAlertCard view={view} incident={incident} people={people} scene={scene} viewer={viewer} act={act} onReset={onReset} />
      <LiveTimelineCard view={view} />
      <LivePhoneCard phone={view.phone} helpInitials={view.owner.initials} checkin={checkin} onSpoken={setSpoken} />
      {open && simCards}
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
