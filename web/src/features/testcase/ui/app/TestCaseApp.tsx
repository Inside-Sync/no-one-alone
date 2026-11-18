'use client'

import { memo, useCallback, useEffect, useRef } from 'react'
import { TestCaseLayout } from '../TestCaseLayout'
import { useTestCaseTab } from '../tabContext'
import { BenchPanel } from '../bench/BenchPanel'
import { useBenchRun } from '../bench/useBenchRun'
import { caseOf, prepareCase, type Scenario } from '../../bench'
import { JudgesPanel, type JudgeJump } from '../judges/JudgesPanel'
import { CaseHeader as CaseHeaderBase } from './CaseHeader'
import { CasePicker as CasePickerBase } from './CasePicker'
import { Baton as BatonBase, Pipe as PipeBase, Stepper as StepperBase, Team as TeamBase } from './Flow'
import { NoaPanel as NoaPanelBase } from './NoaPanel'
import { DbPanel as DbPanelBase, LogPanel as LogPanelBase } from './Panels'
import { StepCard as StepCardBase } from './StepCard'
import { FamilyDashboard, NotAvailable, screensFor } from './registry'
import { useTestCaseEngine } from './useTestCaseEngine'
import { useA } from './parts'
import './app.css'

/**
 * The heavy panels only take the session (`s`), which is a new object only when the engine's snapshot, the text resolver or the judge state
 * changes. Memoised, they do not re-draw for what only the shell holds (the benchmark's progress ticks, the tab).
 */
const CaseHeader = memo(CaseHeaderBase)
const CasePicker = memo(CasePickerBase)
const Stepper = memo(StepperBase)
const Baton = memo(BatonBase)
const Team = memo(TeamBase)
const Pipe = memo(PipeBase)
const StepCard = memo(StepCardBase)
const NoaPanel = memo(NoaPanelBase)
const DbPanel = memo(DbPanelBase)
const LogPanel = memo(LogPanelBase)

/**
 * The Test case, assembled: the picker, the six steps, the eight agents, the three screens of the data path, the demo database and the
 * event log (the "Test case" tab), and the judges' view of the same running engine (the "For judges" tab).
 */
export default function TestCaseApp() {
  const t = useA()
  const s = useTestCaseEngine()
  const { engine, snap } = s
  const { tab, setTab } = useTestCaseTab()
  const bench = useBenchRun()
  const type = engine.caseDef.type
  const screens = screensFor(type)
  const fam = engine.isFam

  const jump = useCallback((j: JudgeJump) => {
    if (j.caseId) s.pick(j.caseId)
    if (j.run === 'judge') s.startJudge()
    setTab(j.tab ?? 'case')
    if (j.anchor) {
      const id = j.anchor
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView?.({ block: 'start' }), 60)
    }
  }, [s, setTab])

  // A Benchmark scenario opened as a case: load the case, put the scenario's inputs in, switch to the Test case tab.
  const openScenario = useCallback((sc: Scenario) => {
    s.pick(caseOf(sc))
    prepareCase(s.engine, sc)
    setTab('case')
  }, [s, setTab])
  // A stable callback for the Benchmark list (it has hundreds of rows and must not re-render on every progress tick).
  const openRef = useRef(openScenario)
  useEffect(() => { openRef.current = openScenario })
  const onOpenScenario = useCallback((sc: Scenario) => openRef.current(sc), [])

  // Back to the top when the tab changes.
  useEffect(() => { document.getElementById('tcHost')?.scrollTo?.({ top: 0 }) }, [tab])

  return (
    <>
      <TestCaseLayout
        tab={tab}
        caseHeader={<CaseHeader s={s} />}
        picker={<CasePicker s={s} />}
        familyDashboard={fam ? <FamilyDashboard engine={engine} snap={snap} r={s.r} /> : undefined}
        stepper={<Stepper s={s} />}
        baton={<Baton s={s} />}
        team={<Team s={s} />}
        card={<StepCard s={s} />}
        pipe={<Pipe s={s} />}
        phone={screens ? <screens.Phone engine={engine} snap={snap} r={s.r} /> : <NotAvailable what={t('fallback.phone')} />}
        web={screens ? <screens.Web engine={engine} snap={snap} r={s.r} /> : <NotAvailable what={t('fallback.web')} />}
        noa={<NoaPanel s={s} Custom={screens?.Noa} />}
        db={<DbPanel s={s} />}
        log={<LogPanel s={s} />}
        judges={<JudgesPanel s={s} onJump={jump} />}
        bench={<BenchPanel run={bench} onOpen={onOpenScenario} />}
      />
    </>
  )
}
