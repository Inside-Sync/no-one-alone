'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SCENARIOS, computeMetrics, type Scenario } from '../../bench'
import { ConfusionMatrix, FailureList, GroupTable, HeadStats, RuleTable, ScenarioTable, SubgroupTable } from './BenchParts'
import { useB } from './useB'
import type { BenchRun } from './useBenchRun'
import './bench.css'

/**
 * The Benchmark tab: the whole labelled scenario set run through the real engine in the browser, with the numbers a judge asks for
 * (accuracy per group and per rule, sensitivity and specificity of "998 now" with 95% intervals, subgroups, every difference listed).
 * `onOpen` opens one scenario as a case in the Test case tab.
 */
export function BenchPanel({ run, onOpen }: { run: BenchRun; onOpen?: (sc: Scenario) => void }) {
  const t = useB()
  const { i18n } = useTranslation()
  const { results, state } = run
  const progress = { done: run.done, total: run.total }
  const metrics = useMemo(() => (results && results.length ? computeMetrics(results) : null), [results])
  const running = state === 'running'
  const pctDone = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const lang = i18n.resolvedLanguage ?? 'en'

  return (
    <div className="tc-bn" lang={lang}>
      <header className="tc-bn-head">
        <h2>{t('title')}</h2>
        <p>{t('intro')}</p>
        <div className="tc-bn-honest" role="note">
          <b>{t('honest.title')}</b>
          <p>{t('honest.body')}</p>
          <p>{t('honest.noise')}</p>
        </div>
      </header>

      <div className="tc-bn-run">
        <div className="btnrow">
          <button type="button" className="btn" id="benchRun" disabled={running} onClick={run.start}>
            {running ? t('run.running') : results ? t('run.again') : t('run.start')}
          </button>
          {running && <button type="button" className="btn ghost" id="benchCancel" onClick={run.cancel}>{t('run.cancel')}</button>}
        </div>
        <div className="tc-bn-prog">
          <div
            className="tc-bn-bar"
            role="progressbar"
            aria-label={t('run.label')}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={state === 'idle' ? 0 : progress.done}
            aria-valuetext={t('run.progress', { done: progress.done, total: progress.total })}
          >
            <span style={{ inlineSize: `${state === 'idle' ? 0 : pctDone}%` }} />
          </div>
          <p className="tc-bn-status" role="status" aria-live="polite">
            {state === 'idle' && t('run.idle')}
            {state === 'running' && t('run.progress', { done: progress.done, total: progress.total })}
            {state === 'done' && metrics && t('run.done', { passed: metrics.passed, total: metrics.total })}
            {state === 'cancelled' && t('run.cancelled', { done: progress.done, total: progress.total })}
          </p>
        </div>
      </div>

      {metrics && (
        <>
          <HeadStats m={metrics} />
          <ConfusionMatrix m={metrics} />
          <GroupTable m={metrics} />
          <RuleTable m={metrics} />
          <SubgroupTable m={metrics} />
          <FailureList m={metrics} />
        </>
      )}

      <ScenarioTable results={results} onOpen={onOpen} />

      <section className="tc-bn-sec" aria-labelledby="tc-bn-limits">
        <h3 id="tc-bn-limits">{t('limits.title')}</h3>
        <ul className="tc-bn-limits">
          <li>{t('limits.a', { n: SCENARIOS.length })}</li>
          <li>{t('limits.b')}</li>
          <li>{t('limits.c')}</li>
          <li>{t('limits.d')}</li>
        </ul>
      </section>
    </div>
  )
}
