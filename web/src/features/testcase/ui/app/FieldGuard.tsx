'use client'

import { useId, useState } from 'react'
import type { InputIssue, Snapshot } from '../../engine'
import type { Resolve } from '../kinds/types'
import { useG } from './Provenance'

/** The issues of one field (plan item B3). `subject` is `safety` or `prevention`. */
export const issuesOf = (snap: Snapshot, subject: string, field: string): InputIssue[] =>
  [...snap.inputIssues.required, ...snap.inputIssues.recommended].filter((i) => i.subject === subject && i.field === field)

/** Required issues are announced at once (alert); recommended ones are warnings (status). The word is always written, not only the colour. */
export function IssueList({ issues, r, id, live = true }: { issues: InputIssue[]; r: Resolve; id?: string; live?: boolean }) {
  const t = useG()
  return (
    <>
      {issues.map((i, n) => (
        <p key={`${i.level}-${i.kind}-${n}`} id={n === 0 ? id : undefined} className={`tc-issue is-${i.level}`} role={live ? (i.level === 'required' ? 'alert' : 'status') : undefined}>
          <b>{t(i.level === 'required' ? 'issue.required' : 'issue.warning')}</b> {r(i.message)}
        </p>
      ))}
    </>
  )
}

/**
 * Under a slider: a box to type an exact value (checked when you leave it or press Enter; the engine refuses a value that is not plausible and says why),
 * and the issues of that field, next to it.
 */
export function FieldGuard({ snap, r, subject, field, label, value, min, max, step = 1, disabled, onSet }: {
  snap: Snapshot; r: Resolve; subject: string; field: string; label: string; value: number | null; min: number; max: number; step?: number
  disabled?: boolean; onSet: (raw: string) => void
}) {
  const t = useG()
  const id = useId()
  // The typed text only counts while the slider value it was typed against is still the current one.
  const [draft, setDraft] = useState<{ at: number | null; text: string } | null>(null)
  const text = draft && draft.at === value ? draft.text : value == null ? '' : String(value)
  const issues = issuesOf(snap, subject, field)
  const commit = () => { if (draft && draft.at === value) onSet(draft.text) }
  return (
    <div className="tc-guard">
      <div className="tc-typed">
        <label htmlFor={id}>{t('issue.typed')}</label><span className="sr" id={`${id}-f`}>{label}</span>
        <input
          id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={text} disabled={disabled}
          aria-invalid={issues.some((i) => i.level === 'required') || undefined} aria-describedby={issues.length ? `${id}-f ${id}-i` : `${id}-f`}
          onChange={(e) => setDraft({ at: value, text: e.target.value })}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
        />
      </div>
      <div id={`${id}-i`}><IssueList issues={issues} r={r} /></div>
    </div>
  )
}
