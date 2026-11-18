'use client'

import { useId, useRef } from 'react'
import { FAMILY_MEMBERS } from '../../../data/family'
import { FAMILY_RANGES } from '../../../data/forecast'
import { tx, type AdultProfile, type InputIssue, type TestCaseEngine } from '../../../engine'
import { signed } from '../signed'
import type { ScreenProps } from '../types'
import { Seg, useP } from '../prevention/parts'

type Field = keyof typeof FAMILY_RANGES
type Toggle = 'smoker' | 'dm' | 'bpTx' | 'cvd' | 'emirati'
const ADULT_TOGGLES: Toggle[] = ['smoker', 'dm', 'bpTx', 'cvd', 'emirati']
const MEASURED = new Set<string>(['tc', 'hdl'])

interface SliderProps {
  engine: TestCaseEngine
  member: string
  field: Field
  value: number
  label: string
  shown: string
  issues: InputIssue[]
  r: ScreenProps['r']
}

/**
 * One slider of the editor (prototype pfRange). While it is dragged the tree and the forecast follow (`commit` false); on release the edit is
 * logged and Noa's alerts are synced (`commit` true). The warnings the engine holds for this field show right under it.
 */
function Slider({ engine, member, field, value, label, shown, issues, r }: SliderProps) {
  const t = useP()
  const id = useId()
  const dirty = useRef(false)
  const rg = FAMILY_RANGES[field]
  const release = () => {
    if (!dirty.current) return
    dirty.current = false
    engine.setProfile(member, field, value, true)
  }
  const mine = issues.filter((i) => i.field === field)
  return (
    <div className="pfrow">
      <div className="row">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{shown}</output>
        <input
          id={id}
          type="range"
          min={rg.min}
          max={rg.max}
          step={rg.step}
          value={value}
          aria-describedby={mine.length ? `${id}-w` : undefined}
          onChange={(e) => { dirty.current = true; engine.setProfile(member, field, Number(e.target.value), false) }}
          onPointerUp={release}
          onKeyUp={release}
          onBlur={release}
        />
      </div>
      {mine.length > 0 && <Issues id={`${id}-w`} issues={mine} r={r} title={t('fam.ed.warnings')} />}
    </div>
  )
}

/** The input guardrail beside a field: a warning (clamped value, cholesterol missing...) or a value that is needed. */
function Issues({ id, issues, r, title }: { id?: string; issues: InputIssue[]; r: ScreenProps['r']; title: string }) {
  return (
    <ul className="tc-issues" id={id} aria-label={title}>
      {issues.map((i) => (
        <li key={`${i.subject}.${i.field}`} className={i.level} role="status">{r(i.message)}</li>
      ))}
    </ul>
  )
}

/**
 * The profile editor of the selected family member (prototype famEditor): sex, yes/no switches, and a slider for every number with the
 * engine's own ranges; for a child the age in months and the weeks overdue. "Reset family" brings every profile back.
 */
export function FamilyEditor({ engine, snap, r }: ScreenProps) {
  const t = useP()
  const sexId = useId()
  const F = snap.state.fm
  const fam = snap.family
  if (!F || !fam) return null
  const k = F.sel
  const m = FAMILY_MEMBERS.find((x) => x.id === k)!
  const p = F.prof[k]
  const name = r(tx(m.name))
  const all = [...snap.inputIssues.required, ...snap.inputIssues.recommended].filter((i) => i.subject === k)
  const fmt = (key: string, v: number) => r(tx(`family.fmt.${key}`, { v: key.endsWith('Trend') ? signed(v) : v }))
  const head = (
    <div className="pf-h">
      <span className="lab">{t('fam.ed.title', { n: name })}</span>
      <button type="button" className="btn sm ghost" onClick={() => engine.resetFamily()}>{t('fam.ed.reset')}</button>
    </div>
  )
  const sl = (field: Field, value: number, shown: string) => (
    <Slider key={`${k}-${field}`} engine={engine} member={k} field={field} value={value} label={r(tx(`family.pfl.${field}`))} shown={shown} issues={all} r={r} />
  )
  if (p.child) {
    return (
      <div className="pfed-in">
        {head}
        <div className="met">
          {sl('ageM', p.ageM, fmt('ageM', p.ageM))}
          {sl('overdueW', p.overdueW, fmt('overdueW', p.overdueW))}
        </div>
        <p className="note">{t('fam.ed.childNote')}</p>
      </div>
    )
  }
  const a: AdultProfile = p
  const labsOn = a.tc != null && a.hdl != null
  const labIssues = all.filter((i) => MEASURED.has(i.field) && !labsOn)
  const ifhas = fam.ifhas[k]
  return (
    <div className="pfed-in">
      {head}
      <span className="lab" id={sexId}>{t('fam.ed.sex')}</span>
      <Seg labelledBy={sexId} value={a.sex} options={[['M', t('fam.ed.male')], ['F', t('fam.ed.female')]]} onChange={(v) => engine.setSex(k, v === 'F' ? 'F' : 'M')} />
      <div className="pfts" role="group" aria-label={t('fam.ed.toggles')}>
        {ADULT_TOGGLES.map((f) => (
          <button key={f} type="button" className="pft" aria-pressed={a[f]} onClick={() => engine.toggleProfile(k, f)}>{r(tx(`family.pfl.${f}`))}</button>
        ))}
        <button type="button" className="pft" aria-pressed={a.tc != null} onClick={() => engine.toggleProfile(k, 'labs')}>{t('fam.ed.labs')}</button>
      </div>
      {labIssues.length > 0 && <Issues issues={labIssues} r={r} title={t('fam.ed.warnings')} />}
      <div className="met">
        {sl('age', a.age, fmt('age', a.age))}
        {sl('sbp', a.sbp, fmt('sbp', a.sbp))}
        {sl('bmi', a.bmi, String(a.bmi))}
        {labsOn && sl('tc', a.tc as number, fmt('mmol', a.tc as number))}
        {labsOn && sl('hdl', a.hdl as number, fmt('mmol', a.hdl as number))}
        {sl('sbpTrend', a.sbpTrend, fmt('sbpTrend', a.sbpTrend))}
        {sl('bmiTrend', a.bmiTrend, fmt('bmiTrend', a.bmiTrend))}
      </div>
      <p className="note">{ifhas ? t('fam.ed.ifhasYes') : a.emirati ? t('fam.ed.ifhasNoAge', { age: a.age }) : t('fam.ed.ifhasNoNat')} {t('fam.ed.release')}</p>
    </div>
  )
}
