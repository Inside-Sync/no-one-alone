'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import * as repo from '@/data/repo'
import type { AuditEntry, PersonId, SharePerson, ShareMatrix } from '@/data/types'
import { CATEGORIES, type CategoryId } from '@/domain/consent'
import type { Who } from '@/domain/views'

/** Placeholder shape; Task 10 replaces the reducer and extends the fields. */
export interface EmergencyState {
  active: boolean
  step: number
  playing: boolean
}
export type EmergencyAction = { type: string; [key: string]: unknown }

interface State {
  who: Who
  viewer: PersonId
  paused: boolean
  audit: AuditEntry[]
  share: ShareMatrix | null
  people: SharePerson[]
  emergency: EmergencyState
  /** True once sessionStorage has been read (avoids redirecting on the SSR default). */
  hydrated: boolean
}

type Action =
  | { type: 'setWho'; who: Who }
  | { type: 'setViewer'; viewer: PersonId }
  | { type: 'togglePause' }
  | { type: 'log'; entry: AuditEntry }
  | { type: 'share'; share: ShareMatrix }
  | { type: 'flip'; viewer: PersonId; cat: CategoryId; on: boolean }
  | { type: 'people'; people: SharePerson[] }
  | { type: 'hydrate'; who?: Who; viewer?: PersonId }
  | { type: 'emergency'; action: EmergencyAction }

const initial: State = {
  who: 'family',
  viewer: 'james',
  paused: false,
  audit: [],
  share: null,
  people: [],
  emergency: { active: false, step: 0, playing: false },
  hydrated: false,
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'setWho': return { ...s, who: a.who }
    case 'setViewer': return { ...s, viewer: a.viewer }
    case 'togglePause': return { ...s, paused: !s.paused }
    case 'log': return { ...s, audit: [...s.audit, a.entry] }
    case 'share': return { ...s, share: a.share }
    case 'flip':
      if (!s.share) return s
      return { ...s, share: { ...s.share, [a.viewer]: { ...s.share[a.viewer], [a.cat]: a.on } } }
    case 'people': return { ...s, people: a.people }
    case 'hydrate': return { ...s, who: a.who ?? s.who, viewer: a.viewer ?? s.viewer, hydrated: true }
    case 'emergency': return s // Task 10 implements the emergency reducer.
  }
}

export interface AppStateValue {
  who: Who
  setWho: (who: Who) => void
  viewer: PersonId
  setViewer: (viewer: PersonId) => void
  paused: boolean
  togglePause: () => void
  toggleShare: (viewer: PersonId, cat: CategoryId) => void
  audit: AuditEntry[]
  log: (entry: AuditEntry) => void
  share: ShareMatrix | null
  people: SharePerson[]
  emergency: EmergencyState
  dispatchEmergency: (action: EmergencyAction) => void
  hydrated: boolean
}

const Ctx = createContext<AppStateValue | null>(null)

/** The fixed prototype "now" (15:10, Wednesday 14 October); never Date.now(). */
const NOW = '15:10'

const KEY = 'noa-app-state'

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, initial)
  const mounted = useRef(true)
  const stateRef = useRef(s)
  useEffect(() => { stateRef.current = s })

  useEffect(() => {
    mounted.current = true
    let who: Who | undefined
    let viewer: PersonId | undefined
    try {
      const raw = sessionStorage.getItem(KEY)
      if (raw) {
        const v = JSON.parse(raw) as { who?: string; viewer?: string }
        if (v.who === 'self' || v.who === 'family') who = v.who
        if (typeof v.viewer === 'string') viewer = v.viewer as PersonId
      }
    } catch {
      /* storage unavailable: keep defaults */
    }
    dispatch({ type: 'hydrate', who, viewer })
    repo.getSharePeople().then((people) => { if (mounted.current) dispatch({ type: 'people', people }) }, () => {})
    repo.getShare().then((share) => { if (mounted.current) dispatch({ type: 'share', share }) }, () => {})
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (!s.hydrated) return
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ who: s.who, viewer: s.viewer }))
    } catch {
      /* ignore */
    }
  }, [s.hydrated, s.who, s.viewer])

  const setWho = useCallback((who: Who) => dispatch({ type: 'setWho', who }), [])
  const setViewer = useCallback((viewer: PersonId) => dispatch({ type: 'setViewer', viewer }), [])
  const log = useCallback((entry: AuditEntry) => {
    dispatch({ type: 'log', entry })
    void repo.appendAudit(entry).catch(() => {})
  }, [])
  const togglePause = useCallback(() => {
    const next = !stateRef.current.paused
    dispatch({ type: 'togglePause' })
    log({
      at: NOW, who: 'Margaret', action: next ? 'pause' : 'resume',
      detail: next ? 'Paused sharing until 9 am tomorrow · safety alerts still on' : 'Resumed sharing',
    })
  }, [log])
  const toggleShare = useCallback((viewer: PersonId, cat: CategoryId) => {
    const cur = stateRef.current.share
    if (cat === 'safety' || !cur) return
    const on = !cur[viewer]?.[cat]
    dispatch({ type: 'flip', viewer, cat, on })
    const name = stateRef.current.people.find((p) => p.id === viewer)?.name ?? viewer
    const label = (CATEGORIES.find((c) => c.id === cat)?.name ?? cat).toLowerCase()
    log({
      at: NOW, who: 'Margaret', action: on ? 'share-on' : 'share-off', viewer, category: cat, on,
      detail: `${on ? 'Now sharing ' : 'Stopped sharing '}${label} with ${name}`,
    })
    repo.saveShare(viewer, cat, on).catch(() => dispatch({ type: 'flip', viewer, cat, on: !on }))
  }, [log])
  const dispatchEmergency = useCallback((action: EmergencyAction) => dispatch({ type: 'emergency', action }), [])

  const value = useMemo<AppStateValue>(
    () => ({
      who: s.who, setWho, viewer: s.viewer, setViewer, paused: s.paused, togglePause, toggleShare,
      audit: s.audit, log, share: s.share, people: s.people, emergency: s.emergency, dispatchEmergency, hydrated: s.hydrated,
    }),
    [s, setWho, setViewer, togglePause, toggleShare, log, dispatchEmergency],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppState(): AppStateValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppState must be used inside AppStateProvider')
  return v
}
