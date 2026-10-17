import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import * as repo from '@/data/repo'
import type { DemoOverrides } from '@/data/api'
import type { CheckinInput, DemoScenario, IncidentDoc, RecoveryRequest, ServerAction } from '@/data/contract'
import { liveView, type LivePeople, type LiveView } from '@/domain/incident'
import { storyNow } from '@/lib/clock'
import { resetsOnLoad } from './reloadReset'

/**
 * The real emergency flow (VITE_DATA_SOURCE=firebase): follows `demo/current` → `incidents/{id}` and posts every
 * write to core-api. In mock mode `live` is false and the Live page plays the prototype's scripted demo instead.
 */
export interface LiveIncidentValue {
  live: boolean
  /** True until the first `demo/current` snapshot. */
  loading: boolean
  error: string | null
  /** False while `demo/current` names an incident whose document has not arrived yet; absent means settled. */
  settled?: boolean
  incident: IncidentDoc | null
  people: LivePeople
  view: LiveView | null
  start: (scenario: DemoScenario, overrides?: DemoOverrides) => Promise<void>
  reset: () => Promise<void>
  checkin: (input: CheckinInput) => Promise<void>
  act: (memberId: string, action: ServerAction) => Promise<void>
  recover: (body: RecoveryRequest) => Promise<void>
}

const NO_PEOPLE: LivePeople = { person: null, members: {} }

const idle = async () => {}

/** Outside the provider (mock mode, unit tests): no live incident, and every write is a no-op. */
const INERT: LiveIncidentValue = {
  live: false, loading: false, error: null, incident: null, people: NO_PEOPLE, view: null, start: idle, reset: idle, checkin: idle, act: idle, recover: idle,
}

const Ctx = createContext<LiveIncidentValue>(INERT)

let reloadHandled = false

export function LiveIncidentProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<repo.LiveSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<LivePeople>(NO_PEOPLE)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!repo.LIVE || reloadHandled) return
    reloadHandled = true
    const nav = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined
    if (resetsOnLoad(nav?.type, window.location.pathname)) repo.resetDemo().catch(() => {})
  }, [])

  useEffect(() => {
    if (!repo.LIVE) return
    return repo.followLive(
      (s) => { setSnap(s); setError(null) },
      (e) => setError(e.message),
    )
  }, [])

  // Names, emergency number and timezone come from the seed; re-read when the demo changes (reset re-seeds).
  const demoId = snap?.demo?.incidentId ?? null
  useEffect(() => {
    if (!repo.LIVE) return
    let on = true
    repo.getSeed().then((s) => { if (on) setPeople(s ? { person: s.person, members: s.members } : NO_PEOPLE) }, () => {})
    return () => { on = false }
  }, [demoId])

  // One story-clock tick a second while the incident is open (countdowns, minutes since alert).
  const incident = snap?.incident ?? null
  const offset = incident?.demo.clockOffsetMs ?? 0
  const open = Boolean(incident && incident.status !== 'CLOSED')
  useEffect(() => {
    if (!open) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [open])
  // Recomputed on every tick and every snapshot; a closed incident freezes at its last snapshot.
  const now = useMemo(() => (incident ? storyNow(offset) : 0), [incident, offset, tick])

  const id = snap?.demo?.incidentId ?? null
  // The view's labels come from i18n at call time: recompute when the language changes too.
  const lang = useTranslation().i18n.resolvedLanguage
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `lang` is a deliberate recompute trigger
  const view = useMemo(() => (incident && id && now ? liveView(id, incident, people, now) : null), [incident, id, people, now, lang])

  const start = useCallback(async (scenario: DemoScenario, overrides?: DemoOverrides) => { await repo.startDemo(scenario, overrides) }, [])
  const reset = useCallback(async () => {
    await repo.resetDemo()
    const s = await repo.getSeed()
    setPeople(s ? { person: s.person, members: s.members } : NO_PEOPLE)
  }, [])
  const checkin = useCallback(async (input: CheckinInput) => {
    if (id) await repo.checkin(id, input)
  }, [id])
  const act = useCallback(async (memberId: string, action: ServerAction) => {
    if (id) await repo.act(id, memberId, action)
  }, [id])

  const recover = useCallback(async (body: RecoveryRequest) => {
    if (id) await repo.recovery(id, body)
  }, [id])

  const value = useMemo<LiveIncidentValue>(() => ({
    live: repo.LIVE, loading: repo.LIVE && snap === null && !error, error, incident, people, view, start, reset, checkin, act, recover,
    settled: snap !== null && (!snap.demo?.incidentId || snap.incident !== null),
  }), [snap, error, incident, people, view, start, reset, checkin, act, recover])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLiveIncident(): LiveIncidentValue {
  return useContext(Ctx)
}
