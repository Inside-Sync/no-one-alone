'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import styles from './careRecord.module.css'
import type { CareStep } from './types'

export interface CareStepperProps {
  /** The steps in order. */
  steps: readonly CareStep[]
  /** Id of the active step; steps before it are marked done. */
  current: string
  /** Called with the id of the step the user picked. */
  onSelect: (id: string) => void
  /** Accessible name of the step list. */
  ariaLabel: string
  /** Bold title of the header, for example "My care record". */
  title: string
  /** Status pill text (for example "Discharged · outpatient follow-up"); a missing value hides the pill. */
  status?: string
  /** Muted line next to the title (hospital and doctor). */
  detail?: string
  /** Extra buttons on the right of the header, for example the whole-case player button. */
  actions?: ReactNode
  /** Value of `data-tour` on the card, for the walkthrough outline. */
  tourId?: string
}

/**
 * Header card of a care record: title, status, doctor line, optional action buttons and the six-step stepper.
 * Presentational: it renders only the text it is given and reports clicks through `onSelect`.
 */
export function CareStepper({ steps, current, onSelect, ariaLabel, title, status, detail, actions, tourId }: CareStepperProps) {
  const at = Math.max(0, steps.findIndex((s) => s.id === current))
  const list = useRef<HTMLOListElement>(null)
  // On a narrow screen the steps scroll sideways: bring the current one to the middle, in both text directions.
  useEffect(() => {
    const ol = list.current
    const btn = ol?.querySelector<HTMLElement>('[aria-current="step"]')
    if (!ol || !btn || ol.scrollWidth <= ol.clientWidth) return
    const o = ol.getBoundingClientRect(), b = btn.getBoundingClientRect()
    ol.scrollLeft += b.left + b.width / 2 - (o.left + o.width / 2)
  }, [current])
  return (
    <article className={`glass card c12 ${styles.head}`} data-tour={tourId}>
      <div className={styles.top}>
        <b className={styles.who}>{title}</b>
        {status && <span className="pill good">{status}</span>}
        {detail && <span className={styles.doc}>{detail}</span>}
        {actions && <span className={styles.actions}>{actions}</span>}
      </div>
      <ol className={styles.steps} aria-label={ariaLabel} ref={list}>
        {steps.map((s, i) => (
          <li key={s.id}>
            <button type="button" className={`${styles.step} ${i < at ? styles.past : ''}`} aria-current={i === at ? 'step' : undefined} onClick={() => onSelect(s.id)}>
              <i>{i + 1}</i><span>{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </article>
  )
}
