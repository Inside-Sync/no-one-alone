import { PEOPLE, TEST_CASES, type TestCaseId } from '../index'
import { claimAutoRun, getEngine, setUi, useTexts } from './store'
import { showRun } from './layout'
import { E, WithNext, c } from './bits'

/** Run a quick test case and bring the panel into view (the auto-run at load stays quiet). */
export function runCase(id: TestCaseId, quiet = false) {
  if (!quiet) claimAutoRun() // a case picked by hand before the load auto-run: the auto-run must not start another journey
  setUi({ drawer: null })
  void getEngine().runTestCase(id, { prepared: quiet })
  if (!quiet) showRun()
}

export function QuickTests() {
  const { u, raw } = useTexts()
  return (
    <section className={c('tcs')} id="fh-tcs" aria-labelledby="fh-tcs-h">
      <div className={c('tch')}><h2 id="fh-tcs-h">{u('tcs.h')}</h2><span className={c('mut sm')}><WithNext text={u('tcs.sub')} /></span></div>
      <div className={c('tcg')}>
        {TEST_CASES.map((t) => (
          <div key={t.id} className={c('tc')} data-tc={t.id}>
            <div className={c('tct')}><E n={PEOPLE[t.person].icon} /><b>{raw(`testCases.${t.id}.title`)}</b></div>
            <p><span className={c('k')}>{u('tcs.context')}</span>{raw(`testCases.${t.id}.context`)}</p>
            <p><span className={c('k')}>{u('tcs.try')}</span>{raw(`testCases.${t.id}.try`)}</p>
            <p><span className={c('k')}>{u('tcs.expect')}</span>{raw(`testCases.${t.id}.expect`)}</p>
            <button type="button" className={c('btn sm gNext')} onClick={() => runCase(t.id)} aria-label={`${u('tcs.run')}: ${raw(`testCases.${t.id}.title`)}`}>{u('tcs.run')}</button>
          </div>
        ))}
      </div>
    </section>
  )
}
