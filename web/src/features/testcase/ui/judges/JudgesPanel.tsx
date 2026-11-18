'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { CASES, CASE_GROUPS } from '../../data/cases'
import { FAMILY_ALERTS } from '../../data/family'
import { RULES, RULES_P } from '../../data/rules'
import { tx, type CaseId } from '../../engine'
import type { TestCaseTab } from '../TestCaseOverlay'
import { JUDGE_BEATS } from '../app/driver'
import { useAd, type SessionProps } from '../app/parts'
import { KPI_IDS, KPI_MODE, computeKpis, pooledKpis, type KpiId, type KpiVal, type Pooled } from './kpis'
import './judges.css'

/** Where a link in the judges' panel goes: a tab, optionally a case (it is loaded), an element to scroll to, or the Judge path. */
export interface JudgeJump { tab?: TestCaseTab; caseId?: CaseId; anchor?: string; run?: 'judge' }

const CRITERIA = ['impact', 'tech', 'working', 'safety', 'scale', 'deploy', 'commercial'] as const
type Criterion = (typeof CRITERIA)[number]

/** The criteria of the talk's judging slide that a block answers, as small chips. */
function Crit({ ids }: { ids: readonly Criterion[] }) {
  const t = useAd()
  return (
    <ul className="tc-crit" aria-label={t('judges.criteriaFor')}>
      {ids.map((c) => <li key={c}>{t(`criteria.${c}`)}</li>)}
    </ul>
  )
}

function Section({ id, title, crit, children, demo }: { id: string; title: string; crit: readonly Criterion[]; children: React.ReactNode; demo?: string }) {
  return (
    <section className="tc-jsec" id={id} aria-labelledby={`${id}-h`}>
      <div className="tc-jsec-h">
        <h3 id={`${id}-h`}>{title}</h3>
        {demo && <span className="pill p-demo">{demo}</span>}
      </div>
      <Crit ids={crit} />
      {children}
    </section>
  )
}

/** Y8: the six questions every judge should be able to get answered in the demo, two lines each, each with a link to the proof. */
const QUESTIONS: { id: string; crit: Criterion; jump: JudgeJump }[] = [
  { id: 'who', crit: 'impact', jump: { tab: 'case', caseId: 'family' } },
  { id: 'agent', crit: 'tech', jump: { tab: 'case', caseId: 'ifhas', anchor: 'team' } },
  { id: 'e2e', crit: 'working', jump: { tab: 'case', run: 'judge' } },
  { id: 'wrong', crit: 'safety', jump: { tab: 'judges', anchor: 'tc-j-wrong' } },
  { id: 'deploy', crit: 'deploy', jump: { tab: 'judges', anchor: 'tc-j-pilot' } },
  { id: 'next', crit: 'commercial', jump: { tab: 'judges', anchor: 'tc-j-pilot' } },
]

function Questions({ onJump }: { onJump: (j: JudgeJump) => void }) {
  const t = useAd()
  return (
    <ol className="tc-q">
      {QUESTIONS.map((q) => (
        <li key={q.id}>
          <b>{t(`questions.${q.id}.q`)}</b>
          <p>{t(`questions.${q.id}.a`)}</p>
          <div className="tc-q-foot">
            <span className="tc-chip">{t(`criteria.${q.crit}`)}</span>
            <button type="button" className="btn ghost sm" onClick={() => onJump(q.jump)}>{t(`questions.${q.id}.link`)} <span className="ic" aria-hidden="true"><Icon name="right" /></span></button>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Y6: the Judge path card: three beats, wow first. */
function JudgePathCard({ onJump }: { onJump: (j: JudgeJump) => void }) {
  const t = useAd()
  return (
    <div className="tc-jpath">
      <ol>
        {JUDGE_BEATS.map((id, i) => (
          <li key={id}>
            <b>{t(`judgePath.beats.${i}.title`)}</b>
            <span className="tc-jp-line"><span className="lab tc-pain">{t('judgePath.pain')}</span> {t(`judgePath.beats.${i}.pain`)}</span>
            <span className="tc-jp-line"><span className="lab tc-magic">{t('judgePath.magic')}</span> {t(`judgePath.beats.${i}.magic`)}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn" onClick={() => onJump({ tab: 'case', run: 'judge' })}>
        <span className="ic" aria-hidden="true"><Icon name="play" /></span> {t('judgePath.start')}
      </button>
    </div>
  )
}

/** Y7: one sentence, the moment that matters and the "How might we" for every case; the case on screen is open. */
function Briefs({ current, r, onJump }: { current: CaseId; r: SessionProps['s']['r']; onJump: (j: JudgeJump) => void }) {
  const t = useAd()
  return (
    <div className="tc-briefs">
      {CASE_GROUPS.flatMap((g) => g.cases).map((id) => (
        <details key={id} open={id === current}>
          <summary><span className="ic" aria-hidden="true"><Icon name={CASES[id].icon} tint /></span> <b>{r(tx(CASES[id].title))}</b> <span className="tc-one">{t(`brief.${id}.one`)}</span></summary>
          <p><span className="lab">{t('brief.momentLab')}</span> {t(`brief.${id}.moment`)}</p>
          <p><span className="lab">{t('brief.hmwLab')}</span> {t(`brief.${id}.hmw`)}</p>
          <button type="button" className="btn ghost sm" onClick={() => onJump({ tab: 'case', caseId: id })}>{t('judges.openCase')}</button>
        </details>
      ))}
    </div>
  )
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

function kpiText(id: KpiId, v: { a: number; b: number }, t: ReturnType<typeof useAd>): string {
  if (KPI_MODE[id] === 'ratio') return t('kpi.ratio', { a: v.a, b: v.b, pct: v.b ? Math.round((100 * v.a) / v.b) : 0 })
  return t(id === 'days' ? 'kpi.days' : 'kpi.minutes', { v: fmt(v.b ? v.a / v.b : 0) })
}

function KpiCard({ id, val, pooled }: { id: KpiId; val: KpiVal; pooled?: { a: number; b: number; n: number } }) {
  const t = useAd()
  const cur = val.state === 'ready' ? kpiText(id, val, t) : t(val.state === 'wait' ? 'kpi.wait' : 'kpi.na')
  return (
    <div className={`kpi tc-kpi tc-kpi-${val.state}`}>
      <div className="lab">{t(`kpi.${id}.label`)}</div>
      <div className="v" aria-live="polite">{cur}</div>
      <div className="d">{t(`kpi.${id}.note`)}</div>
      {pooled && (
        <div className="tc-kpi-pool">
          <span className="lab">{t('kpi.allCases')}</span> {pooled.n ? <>{kpiText(id, pooled, t)} <span className="src">· {t('kpi.casesN', { n: pooled.n })}</span></> : '—'}
        </div>
      )}
    </div>
  )
}

/** Y3: the KPIs, computed from the running engine and (on request) pooled over all ten cases run to the end. */
function Kpis({ s }: SessionProps) {
  const t = useAd()
  const { engine, snap } = s
  const [pooled, setPooled] = useState<Pooled | null>(null)
  // `snap` changes with every engine event, so the numbers follow the run.
  const kpis = useMemo(() => computeKpis(engine), [engine, snap])
  return (
    <>
      <p className="tc-note">{t('kpi.intro', { person: s.r(tx(CASES[snap.state.ck].title)) })}</p>
      <div className="tc-kpis">
        {KPI_IDS.map((id) => <KpiCard key={id} id={id} val={kpis[id]} pooled={pooled?.[id]} />)}
      </div>
      <div className="btnrow">
        <button type="button" className="btn ghost sm" onClick={() => setPooled(pooledKpis(s.tt))}>{t('kpi.pool')}</button>
        {pooled && <button type="button" className="btn ghost sm" onClick={() => setPooled(null)}>{t('kpi.poolClear')}</button>}
      </div>
      <p className="src">{t('kpi.disclaimer')}</p>
    </>
  )
}

const WRONG = ['rules', 'human', 'standdown', 'notnow', 'audit', 'consent', 'analyst', 'where'] as const

function RuleTables({ s }: SessionProps) {
  const t = useAd()
  const { r } = s
  return (
    <details className="tc-rules" id="tc-j-rules">
      <summary>{t('wrong.allRules')}</summary>
      {[
        { id: 'R', title: t('wrong.rulesSafety'), rows: RULES.map((x) => ({ id: x.id, when: r(tx(x.when)), then: r(tx(x.then)) })) },
        { id: 'P', title: t('wrong.rulesPrevention'), rows: RULES_P.map((x) => ({ id: x.id, when: r(tx(x.when)), then: r(tx(x.then)) })) },
        { id: 'F', title: t('wrong.rulesFamily'), rows: FAMILY_ALERTS.map((x) => ({ id: `F-${x.who}`, when: r(tx(x.title)), then: r(tx(x.why)) })) },
      ].map((tab) => (
        <div key={tab.id} className="tblw">
          <table className="tbl2">
            <caption>{tab.title}</caption>
            <thead><tr><th scope="col">{t('wrong.colRule')}</th><th scope="col">{t('wrong.colWhen')}</th><th scope="col">{t('wrong.colThen')}</th></tr></thead>
            <tbody>{tab.rows.map((row) => <tr key={row.id}><th scope="row">{row.id}</th><td>{row.when}</td><td>{row.then}</td></tr>)}</tbody>
          </table>
        </div>
      ))}
    </details>
  )
}

/** Y4: what happens when Noa is wrong. */
function Wrong({ s, onJump }: SessionProps & { onJump: (j: JudgeJump) => void }) {
  const t = useAd()
  return (
    <>
      <ul className="tc-wrong">
        {WRONG.map((id) => (
          <li key={id}>
            <b>{t(`wrong.${id}.t`)}</b>
            <span>{t(`wrong.${id}.d`)}</span>
            {id === 'audit' && <button type="button" className="btn ghost sm" onClick={() => { s.engine.setDbTab('audit'); onJump({ tab: 'case', anchor: 'tc-db' }) }}>{t('wrong.audit.link')}</button>}
            {id === 'consent' && <button type="button" className="btn ghost sm" onClick={() => { s.engine.setDbTab('consents'); onJump({ tab: 'case', anchor: 'tc-db' }) }}>{t('wrong.consent.link')}</button>}
            {id === 'analyst' && <button type="button" className="btn ghost sm" onClick={() => { s.engine.setNoaTab('doh'); onJump({ tab: 'case' }) }}>{t('wrong.analyst.link')}</button>}
          </li>
        ))}
      </ul>
      <RuleTables s={s} />
    </>
  )
}

const PILOT_WHY = ['risk', 'find', 'small', 'review'] as const
const PILOT_KPIS = ['screened', 'days', 'barriers', 'care', 'teach', 'safe'] as const
const PILOT_NEEDS = ['malaffi', 'ifhas', 'hosting', 'signoff', 'language'] as const

/** Y5: path to pilot, one cohort with reasons. A proposal, labelled as such. */
function Pilot({ onJump }: { onJump: (j: JudgeJump) => void }) {
  const t = useAd()
  return (
    <div className="tc-pilot">
      <div className="tc-cohort">
        <span className="lab">{t('pilot.cohortLab')}</span>
        <p><b>{t('pilot.cohort')}</b></p>
        <p className="src">{t('pilot.cohortWhere')}</p>
      </div>
      <div>
        <span className="lab">{t('pilot.whyLab')}</span>
        <ul>{PILOT_WHY.map((k) => <li key={k}>{t(`pilot.why.${k}`)}</li>)}</ul>
      </div>
      <div>
        <span className="lab">{t('pilot.kpiLab')}</span>
        <ul>{PILOT_KPIS.map((k) => <li key={k}>{t(`pilot.kpi.${k}`)}</li>)}</ul>
      </div>
      <div>
        <span className="lab">{t('pilot.needsLab')}</span>
        <ul>{PILOT_NEEDS.map((k) => <li key={k}>{t(`pilot.needs.${k}`)}</li>)}</ul>
      </div>
      <div>
        <span className="lab">{t('pilot.timeLab')}</span>
        <p>{t('pilot.time')}</p>
        <button type="button" className="btn ghost sm" onClick={() => onJump({ tab: 'case', caseId: 'ifhas' })}>{t('pilot.seeCase')}</button>
      </div>
    </div>
  )
}

/** The "For judges" tab: the answers to the judging criteria, shown from the same running engine as the demo. */
export function JudgesPanel({ s, onJump }: SessionProps & { onJump: (j: JudgeJump) => void }) {
  const t = useAd()
  return (
    <>
      <div className="tc-jhead">
        <h2>{t('judges.title')}</h2>
        <p>{t('judges.intro')}</p>
        <ul className="tc-crit tc-crit-all" aria-label={t('judges.criteria')}>
          {CRITERIA.map((c) => <li key={c}>{t(`criteria.${c}`)}</li>)}
        </ul>
      </div>
      <Section id="tc-j-path" title={t('judges.pathTitle')} crit={['working', 'impact']}>
        <JudgePathCard onJump={onJump} />
      </Section>
      <Section id="tc-j-questions" title={t('judges.questionsTitle')} crit={CRITERIA}>
        <Questions onJump={onJump} />
      </Section>
      <Section id="tc-j-brief" title={t('judges.briefTitle')} crit={['impact']}>
        <Briefs current={s.snap.state.ck} r={s.r} onJump={onJump} />
      </Section>
      <Section id="tc-j-kpi" title={t('judges.kpiTitle')} crit={['scale', 'impact', 'commercial']} demo={t('judges.demoData')}>
        <Kpis s={s} />
      </Section>
      <Section id="tc-j-wrong" title={t('judges.wrongTitle')} crit={['safety']}>
        <Wrong s={s} onJump={onJump} />
      </Section>
      <Section id="tc-j-pilot" title={t('judges.pilotTitle')} crit={['deploy', 'commercial']} demo={t('judges.proposal')}>
        <Pilot onJump={onJump} />
      </Section>
    </>
  )
}
