'use client'

import { useCallback, useMemo } from 'react'
import { useDrawer } from '@/components/ui/Drawer'
import { EntryBody } from './EntryBody'
import type { CareEntry, CareLabels } from './types'
import { WholeCasePlayer } from './WholeCasePlayer'

export interface CareRecordDrawer {
  /** Opens the entry with that id in the app drawer; the previous / next buttons and related chips reopen it on another entry. */
  openEntry: (id: string) => void
  /** Opens the whole-case player on the first entry (or on `fromId`). */
  startCase: (fromId?: string) => void
}

/**
 * Connects the entry body and the player to the app drawer (`useDrawer`, so it needs `DrawerProvider`).
 * `entries` must be in time order; `labels` is the caller's wording.
 */
export function useCareRecordDrawer(entries: readonly CareEntry[], labels: CareLabels): CareRecordDrawer {
  const drawer = useDrawer()
  const openEntry = useCallback((id: string) => {
    const entry = entries.find((e) => e.id === id)
    if (!entry) return
    drawer.open(entry.title, <EntryBody entry={entry} entries={entries} labels={labels} onOpen={openEntry} />)
  }, [drawer, entries, labels])
  const startCase = useCallback((fromId?: string) => {
    const k = fromId ? entries.findIndex((e) => e.id === fromId) : 0
    drawer.open(labels.caseTitle, <WholeCasePlayer entries={entries} labels={labels} initialIndex={Math.max(0, k)} />)
  }, [drawer, entries, labels])
  return useMemo(() => ({ openEntry, startCase }), [openEntry, startCase])
}
