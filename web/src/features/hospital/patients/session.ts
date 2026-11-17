'use client'

import { useCallback, useMemo, useState } from 'react'
import type { PatientTask, PatientTimelineItem } from '@/data/patients.types'

/** What the care team did on this page since it opened: kept while the page is mounted, not stored. */
export interface Session {
  reviewed: ReadonlySet<string>
  /** `<patient>:<n>` for an episode, `<patient>:f<n>` for a relative. */
  requested: ReadonlySet<string>
  /** Tasks ticked or unticked by the team, `<patient>:<n>`. */
  done: Readonly<Record<string, boolean>>
  added: Readonly<Record<string, readonly PatientTask[]>>
  notes: Readonly<Record<string, readonly PatientTimelineItem[]>>
  /** Review plans sent (patient ids). */
  sent: ReadonlySet<string>
}

export interface SessionApi extends Session {
  review: (id: string) => void
  request: (key: string) => void
  setDone: (key: string, done: boolean) => void
  addTask: (id: string, task: PatientTask) => void
  addNote: (id: string, note: PatientTimelineItem) => void
  send: (id: string) => void
}

const add = (s: ReadonlySet<string>, v: string) => new Set(s).add(v)

export function useSession(): SessionApi {
  const [s, setS] = useState<Session>({ reviewed: new Set(), requested: new Set(), done: {}, added: {}, notes: {}, sent: new Set() })
  const review = useCallback((id: string) => setS((x) => ({ ...x, reviewed: add(x.reviewed, id) })), [])
  const request = useCallback((key: string) => setS((x) => ({ ...x, requested: add(x.requested, key) })), [])
  const setDone = useCallback((key: string, done: boolean) => setS((x) => ({ ...x, done: { ...x.done, [key]: done } })), [])
  const addTask = useCallback((id: string, task: PatientTask) => setS((x) => ({ ...x, added: { ...x.added, [id]: [...(x.added[id] ?? []), task] } })), [])
  const addNote = useCallback((id: string, note: PatientTimelineItem) => setS((x) => ({ ...x, notes: { ...x.notes, [id]: [note, ...(x.notes[id] ?? [])] } })), [])
  const send = useCallback((id: string) => setS((x) => ({ ...x, sent: add(x.sent, id) })), [])
  return useMemo(() => ({ ...s, review, request, setDone, addTask, addNote, send }), [s, review, request, setDone, addTask, addNote, send])
}
