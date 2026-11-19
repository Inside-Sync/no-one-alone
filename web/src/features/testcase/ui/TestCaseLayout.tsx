'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { panelId, tabId, type TestCaseTab } from './tabContext'

export interface TestCaseLayoutProps {
  /** Which view shows: the case (default), the "For judges" panel or the "Benchmark". */
  tab?: TestCaseTab
  /** The simple view (prototype `.tc.simple`, the default): the baton, team, data path, database and log, and rule details are hidden. */
  simple?: boolean
  /** Inside `.case.card`: title, text, language switch, Run it for me, Restart. */
  caseHeader?: ReactNode
  /** Inside `.picker.card`. */
  picker?: ReactNode
  /** Inside `.famdash.card` (only the family case). */
  familyDashboard?: ReactNode
  /** Rendered as is; supply `<ol className="stepper">`. */
  stepper?: ReactNode
  /** Inside `.baton.card`. */
  baton?: ReactNode
  /** Inside `.team.card`. */
  team?: ReactNode
  /** The sticky bar under the step view (prototype `.nextbar`): Back / Next by hand, the player during a run. Supply `<div className="nextbar">`. */
  nextbar?: ReactNode
  /** Inside `aside.stepcard.card` (left column). */
  card?: ReactNode
  /** Rendered as is, above the three screens; supply `<ol className="pipe card">`. */
  pipe?: ReactNode
  /** Screen 1, inside `.phone > .ph-in`. */
  phone?: ReactNode
  /** Screen 2, inside `.win`. */
  web?: ReactNode
  /** Screen 3 (Hospital and Government), inside `.win`. */
  noa?: ReactNode
  /** Inside `.db.card`, with its own heading. */
  db?: ReactNode
  /** Inside `.log.card`, with its own heading. */
  log?: ReactNode
  /** Inside `.tc-judges.card` while `tab` is `judges`. */
  judges?: ReactNode
  /** Inside `.tc-bench.card` while `tab` is `bench`. */
  bench?: ReactNode
}

/**
 * One case told in six steps; the step card on the left drives one data path across three app screens; database and
 * API log underneath. A region whose prop is missing is not rendered. Containers carry the prototype's class names
 * so the ported CSS applies; the content is the slot's.
 */
export function TestCaseLayout(p: TestCaseLayoutProps) {
  const { t } = useTranslation('testcaseShell')
  const hostRef = useRef<HTMLElement>(null)
  const [stepTitle, setStepTitle] = useState('')
  // Announce only when the step changes (its title), not every time the card's text types or ticks.
  useEffect(() => {
    const title = hostRef.current?.querySelector('#card h3')?.textContent?.trim() ?? ''
    setStepTitle((prev) => (prev === title ? prev : title))
  })
  if (p.tab === 'judges') {
    return (
      <section className="wrap" id={panelId('judges')} role="tabpanel" aria-labelledby={tabId('judges')}>
        <div className="tc-judges card">{p.judges}</div>
      </section>
    )
  }
  if (p.tab === 'bench') {
    return (
      <section className="wrap" id={panelId('bench')} role="tabpanel" aria-labelledby={tabId('bench')}>
        <div className="tc-bench card">{p.bench}</div>
      </section>
    )
  }
  const screens = p.phone || p.web || p.noa
  return (
    <section ref={hostRef} className={p.simple ? 'wrap simple' : 'wrap'} id={panelId('case')} role="tabpanel" aria-labelledby={tabId('case')}>
      <p className="sr" role="status" aria-live="polite" aria-atomic="true">{stepTitle}</p>
      {p.caseHeader && <div className="case card" id="caseHeader">{p.caseHeader}</div>}
      {p.picker && <div className="picker card" id="picker" aria-label={t('layout.picker')}>{p.picker}</div>}
      {p.familyDashboard && <div className="famdash card" id="famdash" aria-label={t('layout.family')}>{p.familyDashboard}</div>}
      {p.stepper}
      {p.baton && <div className="baton card" id="baton" aria-label={t('layout.baton')}>{p.baton}</div>}
      {p.team && <div className="team card" id="team" aria-label={t('layout.team')}>{p.team}</div>}
      {(p.card || screens || p.pipe) && (
        <div className="casegrid">
          <aside className="stepcard card" id="card">{p.card}</aside>
          <div className="tc-main">
            {p.pipe}
            {screens && (
              <div className="screens">
                <div>
                  <div className="scr-h"><span className="lab"><b>1</b> · {t('screen.phone')}</span></div>
                  <div className="phone"><div className="ph-in" id="phone">{p.phone}</div></div>
                </div>
                <div>
                  <div className="scr-h"><span className="lab"><b>2</b> · {t('screen.web')}</span></div>
                  <div className="win" id="web">{p.web}</div>
                </div>
                <div>
                  <div className="scr-h"><span className="lab"><b>3</b> · {t('screen.noa')}</span></div>
                  <div className="win" id="noa">{p.noa}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {p.nextbar}
      {(p.db || p.log) && (
        <div className="bottom">
          {p.db && <div className="db card">{p.db}</div>}
          {p.log && <div className="log card">{p.log}</div>}
        </div>
      )}
    </section>
  )
}
