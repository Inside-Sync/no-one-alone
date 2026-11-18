'use client'

import { memo, useMemo, useState } from 'react'
import { BENCH_GROUPS, SCENARIOS, pct, type Critical, type Metrics, type Outcome, type Rate, type Scenario, type ScenarioResult } from '../../bench'
import { useB, useRuleText, type TB } from './useB'

const ruleWhen = (t: TB, id: string): string => t(id.startsWith('R') ? `rules.${id}.when` : `prevention.rules.${id}.when`)

/** "97.6%" and, under it, "95% CI 92.3% to 99.1%". */
function Pct({ r }: { r: Rate }) {
  const t = useB()
  if (!r.n) return <span className="tc-bn-na">-</span>
  return (
    <span className="tc-bn-pct">
      <b>{pct(r.p)}</b>
      <small>{t('head.ci', { lo: pct(r.lo), hi: pct(r.hi) })}</small>
    </span>
  )
}

function Meter({ r }: { r: Rate }) {
  return <span className="tc-bn-meter" aria-hidden="true"><i style={{ inlineSize: `${Math.round(r.p * 100)}%` }} /></span>
}

export function HeadStats({ m }: { m: Metrics }) {
  const t = useB()
  const c = m.critical
  return (
    <section className="tc-bn-sec" aria-labelledby="tc-bn-head">
      <h3 id="tc-bn-head" className="tc-bn-sr">{t('head.scenarios')}</h3>
      <div className="tc-bn-stats">
        <div className="tc-bn-stat">
          <span className="lab">{t('head.matched')}</span>
          <b>{pct(m.overall.p)}</b>
          <span>{t('head.of', { k: m.passed, n: m.total })}</span>
          <small>{t('head.ci', { lo: pct(m.overall.lo), hi: pct(m.overall.hi) })}</small>
        </div>
        <div className="tc-bn-stat tc-bn-key">
          <span className="lab">{t('head.sens')}</span>
          <b>{c.sensitivity.n ? pct(c.sensitivity.p) : '-'}</b>
          <span>{t('head.of', { k: c.sensitivity.k, n: c.sensitivity.n })}</span>
          <small>{t('head.ci', { lo: pct(c.sensitivity.lo), hi: pct(c.sensitivity.hi) })}</small>
        </div>
        <div className="tc-bn-stat tc-bn-key">
          <span className="lab">{t('head.spec')}</span>
          <b>{c.specificity.n ? pct(c.specificity.p) : '-'}</b>
          <span>{t('head.of', { k: c.specificity.k, n: c.specificity.n })}</span>
          <small>{t('head.ci', { lo: pct(c.specificity.lo), hi: pct(c.specificity.hi) })}</small>
        </div>
      </div>
    </section>
  )
}

export function ConfusionMatrix({ m }: { m: Metrics }) {
  const t = useB()
  const c: Critical = m.critical
  const x = c.confusion
  const n = x.tp + x.fn + x.fp + x.tn
  return (
    <section className="tc-bn-sec" aria-labelledby="tc-bn-crit">
      <h3 id="tc-bn-crit">{t('crit.title')}</h3>
      <p className="tc-bn-intro">{t('crit.intro', { n })}</p>
      <div className="tc-bn-two">
        <div className="tc-bn-tblw">
          <table className="tc-bn-matrix" aria-label={t('crit.matrixLabel')}>
            <thead>
              <tr>
                <th scope="col">{t('crit.corner')}</th>
                <th scope="col">{t('crit.gotYes')}</th>
                <th scope="col">{t('crit.gotNo')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t('crit.expectedYes')}</th>
                <td className="ok"><b>{x.tp}</b></td>
                <td className={x.fn ? 'bad' : ''}><b>{x.fn}</b><small>{t('crit.missed')}</small></td>
              </tr>
              <tr>
                <th scope="row">{t('crit.expectedNo')}</th>
                <td className={x.fp ? 'warn' : ''}><b>{x.fp}</b><small>{t('crit.false')}</small></td>
                <td className="ok"><b>{x.tn}</b></td>
              </tr>
            </tbody>
          </table>
        </div>
        <dl className="tc-bn-defs">
          <div><dt>{t('crit.sens')}</dt><dd><Pct r={c.sensitivity} /><small>{t('crit.sensHelp')}</small></dd></div>
          <div><dt>{t('crit.spec')}</dt><dd><Pct r={c.specificity} /><small>{t('crit.specHelp')}</small></dd></div>
          <div><dt>{t('crit.ppv')}</dt><dd><Pct r={c.ppv} /></dd></div>
          <div><dt>{t('crit.npv')}</dt><dd><Pct r={c.npv} /></dd></div>
        </dl>
      </div>
    </section>
  )
}

export function GroupTable({ m }: { m: Metrics }) {
  const t = useB()
  return (
    <section className="tc-bn-sec" aria-labelledby="tc-bn-groups">
      <h3 id="tc-bn-groups">{t('groups.title')}</h3>
      <p className="tc-bn-intro">{t('groups.intro')}</p>
      <div className="tc-bn-tblw" tabIndex={0} role="region" aria-labelledby="tc-bn-groups">
        <table className="tc-bn-table">
          <thead>
            <tr><th scope="col">{t('groups.col.group')}</th><th scope="col" className="num">{t('groups.col.n')}</th><th scope="col">{t('groups.col.acc')}</th></tr>
          </thead>
          <tbody>
            {BENCH_GROUPS.map((g) => (
              <tr key={g}>
                <th scope="row">{t(`group.${g}`)}</th>
                <td className="num">{m.byGroup[g].n}</td>
                <td><Meter r={m.byGroup[g]} /><Pct r={m.byGroup[g]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function RuleTable({ m }: { m: Metrics }) {
  const t = useB()
  const tr = useRuleText()
  return (
    <section className="tc-bn-sec" aria-labelledby="tc-bn-rules">
      <h3 id="tc-bn-rules">{t('rules.title')}</h3>
      <p className="tc-bn-intro">{t('rules.intro')}</p>
      <div className="tc-bn-tblw" tabIndex={0} role="region" aria-labelledby="tc-bn-rules">
        <table className="tc-bn-table tc-bn-rules">
          <thead>
            <tr>
              <th scope="col">{t('rules.col.rule')}</th>
              <th scope="col">{t('rules.col.when')}</th>
              <th scope="col" className="num">{t('rules.col.pos')}</th>
              <th scope="col" className="num">{t('rules.col.neg')}</th>
              <th scope="col">{t('rules.col.acc')}</th>
            </tr>
          </thead>
          <tbody>
            {m.byRule.map((r) => (
              <tr key={r.rule}>
                <th scope="row" className="mono">{r.rule}</th>
                <td>{ruleWhen(tr, r.rule)}</td>
                <td className="num">{r.positives}</td>
                <td className="num">{r.negatives}</td>
                <td><Meter r={r} /><Pct r={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function SubgroupTable({ m }: { m: Metrics }) {
  const t = useB()
  const rows: { dim: 'lang' | 'time' | 'age' | 'level'; keys: string[] }[] = [
    { dim: 'lang', keys: ['en', 'ar'] },
    { dim: 'time', keys: ['day', 'night'] },
    { dim: 'age', keys: ['child', '18-39', '40-64', '65+'] },
    { dim: 'level', keys: ['easy', 'tough'] },
  ]
  return (
    <section className="tc-bn-sec" aria-labelledby="tc-bn-sub">
      <h3 id="tc-bn-sub">{t('sub.title')}</h3>
      <p className="tc-bn-intro">{t('sub.intro')}</p>
      <div className="tc-bn-tblw" tabIndex={0} role="region" aria-labelledby="tc-bn-sub">
        <table className="tc-bn-table">
          <thead>
            <tr>
              <th scope="col">{t('sub.col.group')}</th>
              <th scope="col" className="num">{t('sub.col.n')}</th>
              <th scope="col">{t('sub.col.acc')}</th>
              <th scope="col">{t('sub.col.sens')}</th>
              <th scope="col">{t('sub.col.spec')}</th>
            </tr>
          </thead>
          {rows.map(({ dim, keys }) => (
            <tbody key={dim}>
              <tr className="tc-bn-dim"><th scope="rowgroup" colSpan={5}>{t(`sub.${dim}`)}</th></tr>
              {keys.map((k) => {
                const r = (m.subgroups[dim] as Record<string, Rate>)[k]
                const c = m.criticalBy[dim][k]
                return (
                  <tr key={k}>
                    <th scope="row">{t(`tag.${dim}.${k}`)}</th>
                    <td className="num">{r.n}</td>
                    <td><Pct r={r} /></td>
                    <td>{c.sensitivity.n ? <><Pct r={c.sensitivity} /><small className="tc-bn-n">{t('head.of', { k: c.sensitivity.k, n: c.sensitivity.n })}</small></> : <span className="tc-bn-na">-</span>}</td>
                    <td>{c.specificity.n ? <><Pct r={c.specificity} /><small className="tc-bn-n">{t('head.of', { k: c.specificity.k, n: c.specificity.n })}</small></> : <span className="tc-bn-na">-</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  )
}

/** One outcome as words: "R5 · 998 now". */
function outcomeText(t: TB, o: Outcome): string {
  return `${o.rule === 'none' ? '' : o.rule + ' · '}${t(`decision.${o.decision}`)}`
}

export function FailureList({ m }: { m: Metrics }) {
  const t = useB()
  return (
    <section className="tc-bn-sec" aria-labelledby="tc-bn-fail">
      <h3 id="tc-bn-fail">{t('fail.title')} <span className="tc-bn-count">{m.failures.length}</span></h3>
      {m.failures.length === 0 ? (
        <p className="tc-bn-intro">{t('fail.none')}</p>
      ) : (
        <>
          <p className="tc-bn-intro">{t('fail.intro')}</p>
          <ul className="tc-bn-fails">
            {m.failures.map((f) => (
              <li key={f.id}>
                <div className="tc-bn-fh"><b className="mono">{f.id}</b> <span dir="auto">{scnTitle(t, f.scenario)}</span></div>
                <dl>
                  <div><dt>{t('fail.expected')}</dt><dd>{outcomeText(t, f.scenario.expected)}</dd></div>
                  <div><dt>{t('fail.actual')}</dt><dd>{outcomeText(t, f.actual)}</dd></div>
                </dl>
                {f.divergence && (
                  <p className="tc-bn-at">
                    {t('fail.at', { step: t(`step.${f.divergence.step}`), agent: t(`agent.${f.divergence.agent}`), field: t(`field.${f.divergence.field}`) })}
                    {' '}({f.divergence.expected} / {f.divergence.actual})
                  </p>
                )}
                {f.scenario.note && <p className="tc-bn-note"><b>{t('fail.note')}:</b> {f.scenario.note}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** A scenario's title in the app language (Arabic titles are in tcBench `scn`; English is the title the scenario carries). */
const scnTitle = (t: TB, s: Scenario): string => t(`scn.${s.id}`, { defaultValue: s.title })

type ResultFilter = 'all' | 'passed' | 'failed'

export const ScenarioTable = memo(function ScenarioTable({ results, onOpen }: { results: ScenarioResult[] | null; onOpen?: (sc: Scenario) => void }) {
  const t = useB()
  const [group, setGroup] = useState('all')
  const [result, setResult] = useState<ResultFilter>('all')
  const [level, setLevel] = useState('all')
  const [q, setQ] = useState('')
  const byId = useMemo(() => new Map((results ?? []).map((r) => [r.id, r])), [results])
  const query = q.trim().toLowerCase()
  const rows = useMemo(() => SCENARIOS.filter((s) => {
    if (group !== 'all' && s.group !== group) return false
    if (level !== 'all' && s.tags.level !== level) return false
    if (query && !(s.id.toLowerCase().includes(query) || scnTitle(t, s).toLowerCase().includes(query))) return false
    const r = byId.get(s.id)
    if (result === 'passed' && !(r && r.pass)) return false
    if (result === 'failed' && !(r && !r.pass)) return false
    return true
  }), [group, level, query, result, byId, t])

  return (
    <section className="tc-bn-sec" aria-labelledby="tc-bn-table">
      <h3 id="tc-bn-table">{t('table.title')}</h3>
      <p className="tc-bn-intro">{t('table.intro')}</p>
      <div className="tc-bn-filters" role="group" aria-label={t('table.filters')}>
        <label>
          <span className="lab">{t('table.group')}</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">{t('table.all')}</option>
            {BENCH_GROUPS.map((g) => <option key={g} value={g}>{t(`group.${g}`)}</option>)}
          </select>
        </label>
        <label>
          <span className="lab">{t('table.result')}</span>
          <select value={result} onChange={(e) => setResult(e.target.value as ResultFilter)}>
            <option value="all">{t('table.all')}</option>
            <option value="passed" disabled={!results}>{t('table.passed')}</option>
            <option value="failed" disabled={!results}>{t('table.failed')}</option>
          </select>
        </label>
        <label>
          <span className="lab">{t('table.level')}</span>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">{t('table.all')}</option>
            <option value="easy">{t('tag.level.easy')}</option>
            <option value="tough">{t('tag.level.tough')}</option>
          </select>
        </label>
        <label className="tc-bn-q">
          <span className="lab">{t('table.search')}</span>
          <input type="search" value={q} placeholder={t('table.searchHint')} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <p className="tc-bn-count-line" role="status" aria-live="polite">{t('table.count', { shown: rows.length, total: SCENARIOS.length })}</p>
      {rows.length === 0 ? (
        <p className="tc-bn-intro">{t('table.none')}</p>
      ) : (
        <div className="tc-bn-tblw" tabIndex={0} role="region" aria-labelledby="tc-bn-table">
          <table className="tc-bn-table tc-bn-scen">
            <thead>
              <tr>
                <th scope="col">{t('table.col.scenario')}</th>
                <th scope="col">{t('table.col.expected')}</th>
                <th scope="col">{t('table.col.actual')}</th>
                <th scope="col">{t('table.col.agent')}</th>
                <th scope="col">{t('table.col.result')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const r = byId.get(s.id)
                const agent = r ? r.actual.agent : s.expected.agent
                return (
                  <tr key={s.id} data-pass={r ? (r.pass ? 'pass' : 'fail') : 'pending'}>
                    <th scope="row" data-label={t('table.col.scenario')}>
                      <span className="mono tc-bn-id">{s.id}</span>
                      <span className="tc-bn-title" dir="auto">{scnTitle(t, s)}</span>
                      <span className="tc-bn-tags">
                        <i>{t(`group.${s.group}`)}</i>
                        <i>{t(`tag.lang.${s.tags.lang}`)}</i>
                        <i>{t(`tag.time.${s.tags.time}`)}</i>
                        <i>{t(`tag.age.${s.tags.age}`)}</i>
                        <i className={s.tags.level === 'tough' ? 'tough' : ''}>{t(`tag.level.${s.tags.level}`)}</i>
                      </span>
                      {onOpen && <button type="button" className="btn ghost sm" onClick={() => onOpen(s)}>{t('table.open')}</button>}
                    </th>
                    <td data-label={t('table.col.expected')}>
                      <b>{outcomeText(t, s.expected)}</b>
                      {s.expected.trigger !== undefined && <small>{s.expected.trigger ? t('table.trigger', { rule: s.expected.trigger }) : t('table.noTrigger')}</small>}
                    </td>
                    <td data-label={t('table.col.actual')}>
                      {r ? (
                        <>
                          <b>{outcomeText(t, r.actual)}</b>
                          {r.actual.trigger !== undefined && <small>{r.actual.trigger ? t('table.trigger', { rule: r.actual.trigger }) : t('table.noTrigger')}</small>}
                        </>
                      ) : <span className="tc-bn-na">-</span>}
                    </td>
                    <td data-label={t('table.col.agent')}>{t(`agent.${agent}`)}</td>
                    <td data-label={t('table.col.result')}>
                      <span className={`tc-bn-badge ${r ? (r.pass ? 'pass' : 'fail') : 'pending'}`}>
                        {r ? (r.pass ? t('table.pass') : t('table.fail')) : t('table.pending')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
})
