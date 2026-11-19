'use client'

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RULES_P } from '../../../data/rules'
import { tx, type Txt } from '../../../engine'
import type { TestCaseEngine } from '../../../engine'
import { RuleId } from '../../app/Provenance'
import type { Resolve } from '../types'
import './prevention.css'

/** The tcPrevention translator (UI chrome of the prevention and family cards). */
export const useP = () => useTranslation('tcPrevention').t

/** One token of the engine's context (person, pronouns, slot, voice line...) as text in the current language. */
export function tok(engine: TestCaseEngine, r: Resolve, name: string): string {
  const v = engine.ctx()[name]
  if (v == null || typeof v === 'boolean') return ''
  if (typeof v === 'object' && 'list' in v) return v.list.map((x) => r(x)).join(v.sep)
  return r(v as Txt | string | number)
}

/** The prototype's "Your turn" box, tinted by the mode (individual or hospital). */
export function YourTurn({ mode, what, children, label }: { mode: 'ind' | 'hosp'; what?: string; label?: ReactNode; children: ReactNode }) {
  const t = useP()
  return (
    <div className={`yourturn mode-${mode}`}>
      <span className="lab"><span className="mtag">{t(`mode.${mode}`)}</span>{label ?? t('turn', { what })}</span>
      {children}
    </div>
  )
}

export interface RangeProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  disabled?: boolean
  onChange: (v: number) => void
}
/** A labelled slider with its value (prototype `rng`). */
export function Range({ id, label, value, min, max, step, unit, disabled, onChange }: RangeProps) {
  return (
    <div className="row">
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{value < 0 ? `−${Math.abs(value)}` : value}{unit ? ` ${unit}` : ''}</output>
      <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

/** A segmented choice (prototype `seg`): buttons with aria-pressed inside a labelled group. */
export function Seg({ labelledBy, value, options, disabled, onChange }: { labelledBy: string; value: string; options: [string, string][]; disabled?: boolean; onChange: (v: string) => void }) {
  return (
    <div className="seg2" role="group" aria-labelledby={labelledBy}>
      {options.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={value === v} disabled={disabled} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  )
}

export function Tile({ k, v, u, cls }: { k: string; v: ReactNode; u?: string; cls?: string }) {
  return <div className={`tile ${cls ?? ''}`}><div className="k">{k}</div><div className="v">{v}{u ? <small>{u}</small> : null}</div></div>
}

/** A coloured result box. `live` makes it announce itself (a decision, a routing). */
export function StatusBox({ tone, title, children, live = true, rtl }: { tone: 'green' | 'amber' | 'red' | 'info'; title: ReactNode; children?: ReactNode; live?: boolean; rtl?: boolean }) {
  return (
    <div className={`result status st-${tone}`} role={live ? 'status' : undefined} {...(rtl ? { dir: 'rtl', lang: 'ar' } : {})}>
      <b>{title}</b>
      {children}
    </div>
  )
}

/** "Right action, right time?" with its tick marks. */
export function Checks({ items, r }: { items: Txt[]; r: Resolve }) {
  const t = useP()
  return (
    <div className="checks">
      <span className="lab">{t('passport.rightTime')}</span>
      <ul>{items.map((x, i) => <li key={i}><span className="ic" aria-hidden="true">✓</span> {r(x)}</li>)}</ul>
    </div>
  )
}

/** The full prevention rule table P1 to P9 with the rule that fired highlighted. */
export function RulesTable({ hit, r, open }: { hit?: string | null; r: Resolve; open?: boolean }) {
  const t = useP()
  return (
    <details className="rules" open={open}>
      <summary>{t('passport.rulesTitle')}</summary>
      <table>
        <thead className="tcp-sr"><tr><th>{t('passport.ruleId')}</th><th>{t('passport.ruleWhen')}</th><th>{t('passport.ruleThen')}</th></tr></thead>
        <tbody>
          {RULES_P.map((x) => (
            <tr key={x.id} className={hit === x.id ? 'hit' : ''} aria-current={hit === x.id ? 'true' : undefined}>
              <td><RuleId id={x.id} /></td><td>{r(tx(x.when))}</td><td>{r(tx(x.then))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">{t('passport.rulesNote')}</p>
    </details>
  )
}
