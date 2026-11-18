import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Mode } from '../../../data'
import { tx } from '../../../engine'
import type { Resolve } from '../types'

/** "Your turn · <what>" block with the mode tag (Individual, Hospital, Government), as the prototype's `yt()`. */
export function YourTurn({ mode, what, r, children, extra }: { mode: Mode; what: string; r: Resolve; children: ReactNode; extra?: string }) {
  const { t } = useTranslation('tcSafety')
  return (
    <div className={`yourturn mode-${mode}${extra ? ' ' + extra : ''}`}>
      <span className="lab">
        <span className="mtag">{t('modeTag', { mode: r(tx(`modes.${mode}`)) })}</span>
        {t('yourTurn', { what })}
      </span>
      {children}
    </div>
  )
}

/** A labelled slider with its live value (prototype `rng`). `null` value shows a dash. */
export function Range({ label, value, min, max, step = 1, unit, disabled, onChange, flag }: {
  label: string; value: number | null; min: number; max: number; step?: number; unit?: string; disabled?: boolean; onChange: (v: number) => void; flag?: 'amber' | 'red'
}) {
  const id = useId()
  return (
    <div className="row">
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id} className={flag ? `flag-${flag}` : undefined}>{value == null ? '—' : `${value}${unit ? ' ' + unit : ''}`}</output>
      <input
        id={id} type="range" min={min} max={max} step={step} value={value ?? min} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

/** A segmented switch: a group of toggle buttons (prototype `seg`). */
export function Seg<V extends string | boolean>({ label, options, value, disabled, onChange }: {
  label: string; options: readonly [V, string][]; value: V; disabled?: boolean; onChange: (v: V) => void
}) {
  return (
    <div className="seg2" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" aria-pressed={value === v} disabled={disabled} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  )
}

/** A green result strip: title in bold, then the text. */
export function Done({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="result status st-green"><b>{title}</b>{children}</div>
}
