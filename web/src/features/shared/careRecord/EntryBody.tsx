'use client'

import styles from './careRecord.module.css'
import { SourceFoot } from './SourceFoot'
import type { CareEntry, CareLabels } from './types'

export interface EntryBodyProps {
  /** The entry to show. */
  entry: CareEntry
  /** All entries in time order: used for the position, the related chips and the previous and next buttons. */
  entries: readonly CareEntry[]
  /** Wording. */
  labels: CareLabels
  /** Called with an entry id when a related chip or the previous / next button is pressed. */
  onOpen: (id: string) => void
}

/**
 * Body of the entry drawer: pills, when and where, the plain sentence, the findings, related entries, source and previous / next.
 * Put it in the app drawer (`useCareRecordDrawer` does that) or anywhere else.
 */
export function EntryBody({ entry, entries, labels, onOpen }: EntryBodyProps) {
  const i = entries.findIndex((e) => e.id === entry.id)
  const prev = i > 0 ? entries[i - 1] : undefined
  const next = i >= 0 && i < entries.length - 1 ? entries[i + 1] : undefined
  const byId = new Map(entries.map((e) => [e.id, e]))
  const related = entry.related.map((id) => byId.get(id)).filter((e): e is CareEntry => !!e)
  const plainFirst = !labels.summaryLabel && entry.summary
  return (
    <div className={styles.entry}>
      <div className={styles.pills}>
        <span className="pill plain">{entry.stage}</span>
        <span className="pill">{entry.kind}</span>
        {i >= 0 && <span className={styles.pos}>{labels.position(i + 1, entries.length)}</span>}
      </div>
      <p className={styles.when}><b>{entry.when}</b><span>{entry.where}</span></p>
      {plainFirst ? <p className={styles.sum}>{entry.summary}</p> : null}
      <dl className={styles.kv}>
        {entry.findings.map(([k, v]) => (<div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>))}
      </dl>
      {labels.summaryLabel && entry.summary ? <p className={styles.note}><small>{labels.summaryLabel}</small>{entry.summary}</p> : null}
      {related.length > 0 && (
        <div className={styles.rel}>
          <small>{labels.related}</small>
          {related.map((r) => <button key={r.id} type="button" className="chip" onClick={() => onOpen(r.id)}>{r.when}{' · '}{r.title}</button>)}
        </div>
      )}
      <SourceFoot source={entry.source} time={entry.when} />
      <div className={styles.pager} role="group" aria-label={labels.entryNavAria}>
        {prev ? <button type="button" className="btn soft sm" onClick={() => onOpen(prev.id)}>{'← '}{prev.title}</button> : <span />}
        {next ? <button type="button" className="btn sm" onClick={() => onOpen(next.id)}>{next.title}{' →'}</button> : <span className="pill good">{labels.last}</span>}
      </div>
    </div>
  )
}
