'use client'

import { useState } from 'react'
import { EntryBody } from './EntryBody'
import styles from './careRecord.module.css'
import type { CareEntry, CareLabels } from './types'

export interface WholeCasePlayerProps {
  /** The whole case in time order. */
  entries: readonly CareEntry[]
  /** Wording. */
  labels: CareLabels
  /** Index of the first entry shown (default 0). Uncontrolled afterwards: the player keeps its own position. */
  initialIndex?: number
}

/**
 * Walks every entry in time order: a progress bar, the entry, back and next (the entry's own previous / next buttons). The drawer around it has the one Close button.
 * Related chips jump to that entry and the progress follows.
 */
export function WholeCasePlayer({ entries, labels, initialIndex = 0 }: WholeCasePlayerProps) {
  const [index, setIndex] = useState(Math.min(Math.max(0, initialIndex), Math.max(0, entries.length - 1)))
  const entry = entries[index]
  if (!entry) return null
  const open = (id: string) => { const k = entries.findIndex((e) => e.id === id); if (k >= 0) setIndex(k) }
  return (
    <div className={styles.player}>
      <div className={styles.bar} role="progressbar" aria-valuemin={1} aria-valuemax={entries.length} aria-valuenow={index + 1}>
        <i style={{ inlineSize: `${((index + 1) / entries.length) * 100}%` }} />
      </div>
      <EntryBody entry={entry} entries={entries} labels={labels} onOpen={open} />
    </div>
  )
}
