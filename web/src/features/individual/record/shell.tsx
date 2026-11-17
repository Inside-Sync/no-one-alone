'use client'

import { KeyboardEvent, ReactNode, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Glyph } from '@/components/ui/Icon'
import type { CareRecord } from '@/data/types'
import { CareStepper } from '@/features/shared/careRecord'
import { type RecordShell, type StepId } from './useRecordShell'
import styles from './record.module.css'

/** The header card with the six steps and the whole-case button; `id` of the active step. */
export function RecordHeader({ shell, record, current, onSelect }: { shell: RecordShell; record: CareRecord; current: StepId; onSelect: (id: StepId) => void }) {
  const { t } = useTranslation('record')
  return (
    <CareStepper
      steps={shell.steps}
      current={current}
      onSelect={(id) => onSelect(id as StepId)}
      ariaLabel={shell.labels.stepsAria}
      title={t(`stepper.title_${shell.who}`)}
      status={record.status}
      detail={record.detail}
      tourId="record-steps"
      actions={<button type="button" className="btn sm" onClick={() => shell.drawer.startCase()}><Glyph name="play" />{shell.labels.startCase}</button>}
    />
  )
}

const activate = (open: () => void) => (e: KeyboardEvent) => {
  if (e.target !== e.currentTarget) return
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() }
}

/** A table row that opens a chart entry; a row without an entry stays plain. */
export function EntryTr({ entry, shell, children }: { entry: string; shell: RecordShell; children: ReactNode }) {
  if (!entry) return <tr>{children}</tr>
  const open = () => shell.drawer.openEntry(entry)
  return <tr className="clk" tabIndex={0} onClick={open} onKeyDown={activate(open)}>{children}</tr>
}

/** A list item that opens a chart entry; an item without an entry stays plain. */
export function EntryLi({ entry, shell, className, style, children }: { entry: string; shell: RecordShell; className?: string; style?: CSSProperties; children: ReactNode }) {
  if (!entry) return <li className={className} style={style}>{children}</li>
  const open = () => shell.drawer.openEntry(entry)
  return <li className={`${styles.click} ${className ?? ''}`} style={style} tabIndex={0} onClick={open} onKeyDown={activate(open)}>{children}</li>
}

/** `.ch` header of a card. */
export function Head({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return <div className="ch"><h2>{title}</h2>{meta != null && <span className="meta">{meta}</span>}{children}</div>
}
