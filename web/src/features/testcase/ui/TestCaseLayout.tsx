'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { panelId, tabId, type TestCaseTab } from './tabContext'

export interface TestCaseLayoutProps {
  /** Which view shows: the case (default), the "For judges" panel or the "Benchmark". */
  tab?: TestCaseTab
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
  /** The run's controls, shown only while a run is on: sticky under the bar, above the stage. */
  playback?: ReactNode
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
  // Where the sticky bar ends, for the things that stick under it (the run controls, the step column).
  useEffect(() => {
    const tc = hostRef.current?.closest<HTMLElement>('.tc')
    const bar = tc?.querySelector<HTMLElement>('.tc-bar')
    if (!tc || !bar) return
    const set = () => { tc.style.setProperty('--bar-bottom', `${Math.round(bar.getBoundingClientRect().bottom - tc.getBoundingClientRect().top)}px`) }
    set()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(set)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [p.tab])
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
  const stage = !!(p.card || screens || p.pipe)
  const team = p.team && <div className="team card" id="team" aria-label={t('layout.team')}>{p.team}</div>
  return (
    <section ref={hostRef} className="wrap" data-run={p.playback ? '' : undefined} id={panelId('case')} role="tabpanel" aria-labelledby={tabId('case')}>
      <p className="sr" role="status" aria-live="polite" aria-atomic="true">{stepTitle}</p>
      {p.caseHeader && <div className="case card" id="caseHeader">{p.caseHeader}</div>}
      {/* Where am I: right under the case header, so a newcomer sees the six steps without scrolling. */}
      {p.stepper}
      {/* The stage: the step card (sticky, scrolls inside itself on a wide screen) beside the team, the data path and the three screens. */}
      {p.playback}
      {stage && (
        <div className="casegrid">
          <aside className="stepcard card" id="card" data-tc-scroll="">{p.card}</aside>
          <div className="tc-main">
            {team}
            {p.pipe}
            {screens && (
              <div className="screens">
                <div>
                  <div className="scr-h"><span className="lab"><b>1</b> · {t('screen.phone')}</span></div>
                  <div className="phone"><div className="ph-in" id="phone" tabIndex={0}>{p.phone}</div></div>
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
      {p.picker && <div className="picker card" id="picker" aria-label={t('layout.picker')}>{p.picker}</div>}
      {p.familyDashboard && <div className="famdash card" id="famdash" aria-label={t('layout.family')}>{p.familyDashboard}</div>}
      {p.baton && <div className="baton card" id="baton" aria-label={t('layout.baton')}>{p.baton}</div>}
      {!stage && team}
      {(p.db || p.log) && (
        <div className="bottom">
          {p.db && <div className="db card">{p.db}</div>}
          {p.log && <div className="log card">{p.log}</div>}
        </div>
      )}
    </section>
  )
}
