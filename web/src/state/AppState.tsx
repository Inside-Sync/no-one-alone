'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import * as repo from '@/data/repo'
import type { AuditEntry, PersonId, SharePerson, ShareMatrix } from '@/data/types'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '@/domain/consent'
import { EM_INITIAL, emergencyReducer, packetArrived, TICK_MS, type EmAction, type EmState } from '@/domain/emergency'
import type { Who } from '@/domain/views'

export type SharePreset = 'family' | 'safety' | 'all'

export type EmergencyState = EmState
export type EmergencyAction = EmAction

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
  emergency: EM_INITIAL,
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
    case 'emergency': {
      const emergency = emergencyReducer(s.emergency, a.action)
      return emergency === s.emergency ? s : { ...s, emergency }
    }
  }
}

export interface AppStateValue {
  who: Who
  setWho: (who: Who) => void
  viewer: PersonId
  setViewer: (viewer: PersonId) => void
  paused: boolean
  /** Returns the toast/audit text, e.g. `Sharing resumed`. */
  togglePause: () => string
  /** Returns the toast/audit text, or null when nothing changed (safety is always on). */
  toggleShare: (viewer: PersonId, cat: CategoryId, onFail?: (msg: string) => void) => string | null
  /** A quick choice for the three family rows (prototype `data-preset`). Returns the toast text. */
  applyPreset: (kind: SharePreset, onFail?: (msg: string) => void) => string
  audit: AuditEntry[]
  log: (entry: AuditEntry) => void
  share: ShareMatrix | null
  people: SharePerson[]
  emergency: EmergencyState
  dispatchEmergency: (action: EmergencyAction) => void
  /** True once the hospital holds Margaret's packet (02:07 of a running demo): Pre-arrivals shows "1 new". */
  packetNew: boolean
  hydrated: boolean
}

const Ctx = createContext<AppStateValue | null>(null)

/** The fixed prototype "now" (15:10, Wednesday 14 October); never Date.now(). */
const NOW = '15:10'

const KEY = 'noa-app-state'

/** Prototype presets act on the family rows only (line 1982). */
const PRESET_ROWS: PersonId[] = ['james', 'sarah', 'david']
const PRESET_TEXT: Record<SharePreset, string> = {
  safety: 'Family now sees safety alerts only',
  all: 'Family now sees everything',
  family: 'Family sees most things, not your mood',
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, initial)
  const mounted = useRef(true)
  const stateRef = useRef(s)
  // Every action goes through commit(), so stateRef is current as soon as an action is dispatched. Syncing it in a
  // passive effect instead left a window after a commit (e.g. consent just loaded) where toggleShare saw share=null
  // and silently did nothing (the flaky "heart-category card is absent for sarah" test, Task 14 / R35).
  // Two updates in one tick must both see the first: keep the ref ahead of the render.
  const commit = useCallback((a: Action) => {
    stateRef.current = reducer(stateRef.current, a)
    dispatch(a)
  }, [])

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
    commit({ type: 'hydrate', who, viewer })
    repo.getSharePeople().then((people) => { if (mounted.current) commit({ type: 'people', people }) }, () => {})
    repo.getShare().then((share) => { if (mounted.current) commit({ type: 'share', share }) }, () => {})
    return () => { mounted.current = false }
  }, [commit])

  useEffect(() => {
    if (!s.hydrated) return
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ who: s.who, viewer: s.viewer }))
    } catch {
      /* ignore */
    }
  }, [s.hydrated, s.who, s.viewer])

  // The demo clock lives here, not in the page, so the alert keeps running on every tab. Cleared when paused, ended or unmounted.
  const { active, playing } = s.emergency
  useEffect(() => {
    document.body.classList.toggle('night', active)
    return () => document.body.classList.remove('night')
  }, [active])
  useEffect(() => {
    if (!active || !playing) return
    const timer = setInterval(() => commit({ type: 'emergency', action: { type: 'tick' } }), TICK_MS)
    return () => clearInterval(timer)
  }, [active, playing, commit])

  const setWho = useCallback((who: Who) => commit({ type: 'setWho', who }), [commit])
  const setViewer = useCallback((viewer: PersonId) => commit({ type: 'setViewer', viewer }), [commit])
  const log = useCallback((entry: AuditEntry) => {
    commit({ type: 'log', entry })
    void repo.appendAudit(entry).catch(() => {})
  }, [commit])
  const togglePause = useCallback(() => {
    const next = !stateRef.current.paused
    commit({ type: 'togglePause' })
    // Prototype line 1985: the toast text is also what the audit records.
    const detail = next ? 'Sharing paused until 9 am tomorrow · safety alerts still on' : 'Sharing resumed'
    log({ at: NOW, who: 'Margaret', action: next ? 'pause' : 'resume', detail })
    return detail
  }, [log, commit])
  const toggleShare = useCallback((viewer: PersonId, cat: CategoryId, onFail?: (msg: string) => void) => {
    const cur = stateRef.current.share
    if (!cur) return null
    // Prototype line 1983: only emergency contacts' safety switches are locked; the others store a value (sees() still shows safety).
    if (cat === 'safety' && stateRef.current.people.find((p) => p.id === viewer)?.emergency) return null
    const on = !cur[viewer]?.[cat]
    commit({ type: 'flip', viewer, cat, on })
    const name = stateRef.current.people.find((p) => p.id === viewer)?.name ?? viewer
    const label = (CATEGORIES.find((c) => c.id === cat)?.name ?? cat).toLowerCase()
    const detail = `${on ? 'Now sharing ' : 'Stopped sharing '}${label} with ${name}`
    log({ at: NOW, who: 'Margaret', action: on ? 'share-on' : 'share-off', viewer, category: cat, on, detail })
    repo.saveShare(viewer, cat, on).catch(() => {
      // A late rejection must not clobber a newer change: undo only while the optimistic value still stands.
      if (stateRef.current.share?.[viewer]?.[cat] !== on) return
      commit({ type: 'flip', viewer, cat, on: !on })
      log({ at: NOW, who: 'Margaret', action: on ? 'share-off' : 'share-on', viewer, category: cat, on: !on, detail: repo.SAVE_FAILED })
      onFail?.(repo.SAVE_FAILED)
    })
    return detail
  }, [log, commit])
  const applyPreset = useCallback((kind: SharePreset, onFail?: (msg: string) => void) => {
    const cur = stateRef.current.share
    const detail = PRESET_TEXT[kind]
    if (!cur) return detail
    const next: ShareMatrix = { ...cur }
    const changed: [PersonId, CategoryId, boolean][] = []
    for (const id of PRESET_ROWS) {
      const row = { ...cur[id] }
      for (const cat of CATEGORY_IDS) {
        const on = kind === 'safety' ? cat === 'safety' : kind === 'all' ? true : cat !== 'mood' && cat !== 'location'
        if (row[cat] !== on) { row[cat] = on; changed.push([id, cat, on]) }
      }
      next[id] = row
    }
    commit({ type: 'share', share: next })
    log({ at: NOW, who: 'Margaret', action: 'preset', detail })
    // One unit: if any save fails, every cell still holding the preset's value goes back and the stored ones are restored.
    Promise.allSettled(changed.map(([id, cat, on]) => repo.saveShare(id, cat, on))).then((results) => {
      if (results.every((r) => r.status === 'fulfilled')) return
      changed.forEach(([id, cat, on], i) => {
        if (stateRef.current.share?.[id]?.[cat] !== on) return
        commit({ type: 'flip', viewer: id, cat, on: !on })
        if (results[i].status === 'fulfilled') repo.saveShare(id, cat, !on).catch(() => {})
      })
      log({ at: NOW, who: 'Margaret', action: 'preset', detail: repo.SAVE_FAILED })
      onFail?.(repo.SAVE_FAILED)
    })
    return detail
  }, [log, commit])
  const dispatchEmergency = useCallback((action: EmergencyAction) => commit({ type: 'emergency', action }), [commit])

  const value = useMemo<AppStateValue>(
    () => ({
      who: s.who, setWho, viewer: s.viewer, setViewer, paused: s.paused, togglePause, toggleShare, applyPreset,
      audit: s.audit, log, share: s.share, people: s.people, emergency: s.emergency, dispatchEmergency, packetNew: packetArrived(s.emergency), hydrated: s.hydrated,
    }),
    [s, setWho, setViewer, togglePause, toggleShare, applyPreset, log, dispatchEmergency],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppState(): AppStateValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppState must be used inside AppStateProvider')
  return v
}
