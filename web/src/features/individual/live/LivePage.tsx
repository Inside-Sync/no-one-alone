'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePathname, useRouter } from '@/app/navigation'
import { apiErrorCode, getOrbitScene } from '@/data/repo'
import { PageError } from '@/features/shared/PageError'
import { useRepo } from '@/features/shared/useRepo'
import { STEPS } from '@/domain/emergency'
import { ambulanceStatus } from '@/domain/incident'
import { agentView } from '@/domain/agent'
import { ALERT_MIN, NO_REPLY_SECONDS, SIM_DEFAULTS, alertRun, clockText, scenarioFor, type Watch } from '@/domain/simulator'
import { useToast } from '@/components/ui/Toast'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import { AgentCard } from './AgentCard'
import { AlertCard } from './AlertCard'
import { CallsCard } from './CallsCard'
import { ConversationsCard } from './ConversationsCard'
import { HandoverCard } from './HandoverCard'
import { IdleCard } from './IdleCard'
import { LiveAlertCard } from './LiveAlertCard'
import { IdlePhoneCard, LivePhoneCard } from './LivePhoneCard'
import { LiveReadingsCard } from './LiveReadingsCard'
import { NoaLogCard } from './NoaLogCard'
import { callKeys, freshCallSound, playDial000, playRing } from './ring'
import { PhoneCard } from './PhoneCard'
import { SimulatorCard } from './SimulatorCard'
import { SpeechCheckCard } from './SpeechCheckCard'
import { useAutopilot } from './useAutopilot'
import { NIGHT_DEMO, NIGHT_DEMO_STOP } from './nightDemo'
import { useCallDialogue } from './useCallDialogue'
import { useWatch } from './useWatch'
import { TimelineCard } from './TimelineCard'
import './live.css'

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
function useCallRing(timeline: Timeline | undefined, id = '') {
  const [initial, setInitial] = useState<ReadonlySet<string> | null>(null)
  if (timeline && initial === null) setInitial(new Set(callKeys(timeline, id)))
  const seen = useRef<Set<string> | null>(null)
  const [dial, setDial] = useState<{ at: string; done: Promise<void> } | null>(null)
  const chain = useRef<Promise<void>>(Promise.resolve())
  useEffect(() => {
    if (!timeline) return
    if (seen.current === null) { seen.current = new Set(callKeys(timeline, id)); return }
    const sound = freshCallSound(timeline, seen.current, id)
    const auto = autoCall(timeline)
    const at = auto && `${id} ${auto.at}`
    if (sound === 'dial' && at) {
      const done = chain.current.then(() => playDial000())
      chain.current = done
      // Async so the effect does not set state synchronously.
      void Promise.resolve().then(() => setDial({ at, done }))
    } else if (sound === 'ring') chain.current = chain.current.then(() => playRing(3000))
  }, [timeline]) // eslint-disable-line react-hooks/exhaustive-deps
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
  const { viewer, holdNight } = useAppState()
  const { loading, settled = true, error, incident, people, view, start, reset, checkin, act } = useLiveIncident()
  const scene = useRepo(getOrbitScene).data
  useFlash(Boolean(view?.phone.flash))
  // Not before the followed incident arrives, or a call already on it would count as new.
  const calls = useCallRing(loading || !settled ? undefined : incident?.timeline ?? [], view?.id)
  const [dialogueDone, setDialogueDone] = useState<{ id: string; silent: boolean } | null>(null)
  // Margaret's phone speech queue, shared so the 000 lines wait for her status clip.
  const speech = useRef<Promise<void>>(Promise.resolve())
  const { t } = useTranslation('live')
  // Autopilot answers only for an incident this tab started from the Simulator.
  const [auto, setAuto] = useState(false)
  // questionKey is not incident-scoped, so a new run must forget the last one.
  const [spoken, setSpoken] = useState<string | null>(null)
  // Kept here, not in the cards, so the settings survive the incident they started.
  const sim = SIM_DEFAULTS
  const [busy, setBusy] = useState(false)
  // The incident she answered by hand on: no autopilot voice for it.
  const [manual, setManual] = useState<string | null>(null)
  const open = Boolean(view?.open)
  const begin = (hr: number, movementMin: number) => {
    setBusy(true)
    setSpoken(null)
    setManual(null)
    toast(t('live.starting'))
    start(scenarioFor(), { hr, movementMin, noReplySeconds: NO_REPLY_SECONDS })
      .then(() => setAuto(true))
      .catch((e: unknown) => { holdNight(false); toast(apiErrorCode(e) === 'INVALID_STATE' ? t('live.busy') : t('live.failed')) })
      .finally(() => setBusy(false))
  }
  const onAlert = (w: Watch) => begin(w.hr, alertRun(w.readings))
  const watch = useWatch({ locked: open, onAlert })
  const onReset = () => {
    if (busy) return
    setAuto(false); setSpoken(null); setManual(null); watch.reset(); holdNight(false)
    reset().then(() => toast(t('live.resetDone')), () => toast(t('live.failed')))
  }
  useAutopilot({ enabled: auto && open, voice: manual !== view?.id, settings: sim, incident, view, spokenKey: spoken, checkin, act })
  // The top bar's Night alert demo, like the prototype's startEm: Night emergency selected and the watch running. An open
  // incident is reset first so the demo starts over.
  const pathname = usePathname()
  const router = useRouter()
  const nightDemo = useRef(() => {})
  useEffect(() => {
    nightDemo.current = () => {
      if (!open) { watch.loadPreset('night'); return }
      if (busy) return
      setAuto(false); setSpoken(null); setManual(null)
      reset().then(() => watch.loadPreset('night'), () => { holdNight(false); toast(t('live.failed')) })
    }
  })
  const stopDemo = useRef(onReset)
  useEffect(() => { stopDemo.current = onReset })
  useEffect(() => {
    const run = () => nightDemo.current()
    const stop = () => stopDemo.current()
    window.addEventListener(NIGHT_DEMO, run)
    window.addEventListener(NIGHT_DEMO_STOP, stop)
    return () => { window.removeEventListener(NIGHT_DEMO, run); window.removeEventListener(NIGHT_DEMO_STOP, stop) }
  }, [])
  useEffect(() => {
    if (loading || new URLSearchParams(window.location.search).get('demo') !== 'night') return
    nightDemo.current()
    router.replace(pathname)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps
  const call = incident && view ? autoCall(incident.timeline) : undefined
  const dialogue = useCallDialogue({
    callKey: call && calls.initial ? `${view?.id} ${call.at}` : null,
    live: Boolean(call && calls.initial && !calls.initial.has(callKeys([call], view?.id)[0])),
    davidAccepted: Boolean(incident?.timeline.some((e) => e.kind === 'ACCEPTED')),
    dialDone: call && calls.dial?.at === `${view?.id} ${call.at}` ? calls.dial.done : null, speechRef: speech,
    onDone: (silent) => { if (view) setDialogueDone({ id: view.id, silent }) },
  })

  if (error) return <PageError page="live" onRetry={() => location.reload()} />
  if (loading) return <main className="grid" data-page="live"><p className="fine c12">{t('live.loading')}</p></main>
  const shown = incident && view ? { incident, view } : null
  const agent = agentView(shown?.incident ?? null, people)
  const name = (people.person?.displayName ?? view?.personName ?? '').split(' ')[0]
  const num = people.person?.emergencyNumber ?? view?.emergencyNumber ?? '000'
  const ambulance = shown && dialogueDone?.id === shown.view.id ? { ...ambulanceStatus(shown.view.id), ...(dialogueDone.silent ? { clip: null } : {}) } : null
  // The prototype's sim page: controls, circle and readings, Noa / calls / her phone, then the conversation and the log.
  return (
    <main className="grid" data-page="live">
      <SimulatorCard watch={watch} locked={open || busy} onReset={onReset} />
      <LiveAlertCard view={shown?.view ?? null} incident={shown?.incident ?? null} people={people} scene={scene} viewer={viewer} act={act} manual={!auto} />
      <LiveReadingsCard watch={watch.watch} />
      <AgentCard agent={agent} num={num} />
      <CallsCard agent={agent} />
      {shown ? (
        <LivePhoneCard phone={shown.view.phone} name={name} helpInitials={shown.view.owner.initials} checkin={checkin} onSpoken={setSpoken} speechRef={speech}
          onManual={() => setManual(shown.view.id)} statusOverride={ambulance} />
      ) : (
        <IdlePhoneCard name={name} time={clockText(watch.watch.clock)} disabled={busy} onHelp={() => begin(watch.watch.hr > 120 ? watch.watch.hr : 142, ALERT_MIN)} />
      )}
      <SpeechCheckCard incident={shown?.incident ?? null} name={name} timeZone={people.person?.timezone ?? 'Asia/Ho_Chi_Minh'}
        onReplay={() => nightDemo.current()} busy={busy} />
      <ConversationsCard incident={shown?.incident ?? null} people={people} call={dialogue.lines} dialling={dialogue.dialling} />
      <HandoverCard incident={shown?.incident ?? null} view={shown?.view ?? null} people={people} agent={agent} />
      <NoaLogCard view={shown?.view ?? null} time={clockText(watch.watch.clock)} />
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
