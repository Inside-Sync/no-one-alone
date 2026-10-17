'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getOrbitScene } from '@/data/repo'
import { PageError } from '@/features/shared/PageError'
import { useRepo } from '@/features/shared/useRepo'
import { STEPS } from '@/domain/emergency'
import { ambulanceStatus } from '@/domain/incident'
import { NIGHT_ALERT } from '@/domain/simulator'
import { useToast } from '@/components/ui/Toast'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import { AlertCard } from './AlertCard'
import { EmergencyCallCard } from './EmergencyCallCard'
import { IdleCard } from './IdleCard'
import { LiveAlertCard } from './LiveAlertCard'
import { LivePhoneCard } from './LivePhoneCard'
import { LiveReadingsCard } from './LiveReadingsCard'
import { LiveTimelineCard } from './LiveTimelineCard'
import { callKeys, freshCallSound, playDial000, playRing } from './ring'
import { PhoneCard } from './PhoneCard'
import { SimulatorCard } from './SimulatorCard'
import { SpeechCheckCard } from './SpeechCheckCard'
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

type Timeline = readonly { at: string; kind: string; text: string }[]
const autoCall = (timeline: Timeline) => timeline.find((e) => e.kind === 'CALLED_115' && e.text.startsWith('Calling '))

/** Rings or dials once per new call, one sound after another; returns the calls seen at load and the 000 dial. */
function useCallRing(timeline: Timeline | undefined) {
  const [initial, setInitial] = useState<ReadonlySet<string> | null>(null)
  if (timeline && initial === null) setInitial(new Set(callKeys(timeline)))
  const seen = useRef<Set<string> | null>(null)
  const [dial, setDial] = useState<{ at: string; done: Promise<void> } | null>(null)
  const chain = useRef<Promise<void>>(Promise.resolve())
  useEffect(() => {
    if (!timeline) return
    if (seen.current === null) { seen.current = new Set(callKeys(timeline)); return }
    const sound = freshCallSound(timeline, seen.current)
    const at = autoCall(timeline)?.at
    if (sound === 'dial' && at) {
      const done = chain.current.then(() => playDial000())
      chain.current = done
      // Async so the effect does not set state synchronously.
      void Promise.resolve().then(() => setDial({ at, done }))
    } else if (sound === 'ring') chain.current = chain.current.then(() => playRing(3000))
  }, [timeline])
  return { initial, dial }
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
  const { loading, settled = true, error, incident, people, view, start, reset, checkin, act } = useLiveIncident()
  const scene = useRepo(getOrbitScene).data
  useFlash(Boolean(view?.phone.flash))
  // Not before the followed incident arrives, or a call already on it would count as new.
  const calls = useCallRing(loading || !settled ? undefined : incident?.timeline ?? [])
  const [dialogueDone, setDialogueDone] = useState<{ id: string; silent: boolean } | null>(null)
  // Margaret's phone speech queue, shared so the 000 lines wait for her status clip.
  const speech = useRef<Promise<void>>(Promise.resolve())
  const { t } = useTranslation('live')
  // Autopilot answers only for an incident this tab started from the Simulator.
  const [auto, setAuto] = useState(false)
  // questionKey is not incident-scoped, so a new run must forget the last one.
  const [spoken, setSpoken] = useState<string | null>(null)
  const onReset = () => { setAuto(false); setSpoken(null); reset().then(() => toast(t('live.resetDone')), () => toast(t('live.failed'))) }
  // Kept here, not in the cards, so the settings survive the incident they started.
  const [sim, setSim] = useState(NIGHT_ALERT)
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
  const call = autoCall(incident.timeline)
  const ambulance = dialogueDone?.id === view.id ? { ...ambulanceStatus(view.id), ...(dialogueDone.silent ? { clip: null } : {}) } : null
  return (
    <main className="grid" data-page="live">
      {!open && simCards}
      <LiveAlertCard view={view} incident={incident} people={people} scene={scene} viewer={viewer} act={act} onReset={onReset} />
      <LiveTimelineCard view={view} />
      <LivePhoneCard phone={view.phone} helpInitials={view.owner.initials} checkin={checkin} onSpoken={setSpoken} speechRef={speech}
        statusOverride={ambulance} />
      <SpeechCheckCard turns={incident.checkIn?.turns ?? []} />
      {call && calls.initial && (
        <EmergencyCallCard key={call.at} live={!calls.initial.has(callKeys([call])[0])}
          davidAccepted={incident.timeline.some((e) => e.kind === 'ACCEPTED')}
          dialDone={calls.dial?.at === call.at ? calls.dial.done : null} speechRef={speech}
          onDone={(silent) => setDialogueDone({ id: view.id, silent })} />
      )}
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
