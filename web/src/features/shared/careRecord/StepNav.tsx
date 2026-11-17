'use client'

import styles from './careRecord.module.css'
import type { CareLabels, CareStep } from './types'

export interface StepNavProps {
  steps: readonly CareStep[]
  /** Id of the active step. */
  current: string
  onSelect: (id: string) => void
  /** Uses `backTo` and `nextTo`. */
  labels: Pick<CareLabels, 'backTo' | 'nextTo'>
}

/** Back and Next buttons under a step ("Back: Results", "Next: Follow-up"); an end of the range shows no button. */
export function StepNav({ steps, current, onSelect, labels }: StepNavProps) {
  const at = steps.findIndex((s) => s.id === current)
  const prev = at > 0 ? steps[at - 1] : undefined
  const next = at >= 0 && at < steps.length - 1 ? steps[at + 1] : undefined
  return (
    <div className={`c12 ${styles.nav}`}>
      {prev ? <button type="button" className="btn soft" onClick={() => onSelect(prev.id)}>{'← '}{labels.backTo(prev.label)}</button> : <span />}
      {next ? <button type="button" className="btn" onClick={() => onSelect(next.id)}>{labels.nextTo(next.label)}{' →'}</button> : <span />}
    </div>
  )
}
