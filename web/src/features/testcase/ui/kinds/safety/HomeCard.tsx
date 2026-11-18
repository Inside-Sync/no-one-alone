import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Glyph } from '@/components/ui/Icon'
import { QUESTIONS, RULES } from '../../../data'
import { SAFETY_RANGES } from '../../../data/forecast'
import { hm, runLen, tx, type SafetyInputs } from '../../../engine'
import { FieldGuard, IssueList, issuesOf } from '../../app/FieldGuard'
import { ProvTag, useG } from '../../app/Provenance'
import type { KindProps } from '../types'
import { Range, Seg, YourTurn } from './Controls'
import { SpeechCheck } from './SpeechCheck'

const W = 300, H = 96
const px = (i: number) => 8 + (i * (W - 16)) / 39
const py = (v: number) => H - 8 - ((Math.max(40, Math.min(180, v)) - 40) / 140) * (H - 20)

/** Heart rate by minute: the 120 bpm line, the points that count towards R1, and the minute the sensor event happens. */
function Chart({ snap, tagText }: { snap: KindProps['snap']; tagText: string }) {
  const { t } = useTranslation('tcSafety')
  const S = snap.state
  const pts = S.read.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hr-chart" role="img" aria-label={t('home.chart')}>
      <line x1="8" x2={W - 8} y1={py(120)} y2={py(120)} stroke="var(--bad)" strokeDasharray="4 3" />
      <text x={W - 8} y={py(120) - 3} textAnchor="end" fontSize="9" fill="var(--bad)">120 {t('units.bpm')}</text>
      {pts && <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="2" />}
      {S.read.map((v, i) => (v > 120 && !S.mv[i] ? <circle key={i} cx={px(i).toFixed(1)} cy={py(v).toFixed(1)} r="2.4" fill="var(--bad)" /> : null))}
      {S.read.length > 10 && (
        <>
          <line x1={px(10)} x2={px(10)} y1="6" y2={H - 8} stroke="var(--muted)" strokeDasharray="2 3" />
          <text x={px(10) + 3} y="12" fontSize="9" fill="var(--muted)">{hm(S.start + 10)}{tagText ? ' ' + tagText : ''}</text>
        </>
      )}
      <text x="8" y={H - 0.5} fontSize="9" fill="var(--muted)">{hm(S.start)}</text>
      <text x={W - 8} y={H - 0.5} textAnchor="end" fontSize="9" fill="var(--muted)">{hm(S.start + 39)}</text>
    </svg>
  )
}

const reducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Step 0 of the safety cases: enter the readings, play, speech check, Noa's question, the decision, the rule table. */
export function HomeCard({ engine, snap, r }: KindProps) {
  const { t } = useTranslation('tcSafety')
  const S = snap.state
  const I = S.inp as SafetyInputs
  const lock = S.phase !== 'setup'
  const person = engine.person
  const nm = r(tx(person.t.n!))
  const k = runLen(S.read, S.mv)
  const last = S.read.length ? S.read[S.read.length - 1] : null

  // The sensor playback: one simulated minute every 90 ms (instant when the person asked for less motion).
  useEffect(() => {
    if (S.phase !== 'playing') return
    const id = setInterval(() => { if (!engine.playTick()) clearInterval(id) }, reducedMotion() ? 0 : 90)
    return () => clearInterval(id)
  }, [S.phase, engine])

  const tag = I.fall ? t('home.tagFall') : I.glu != null && I.glu < 4 ? t('home.tagGlucose', { glu: I.glu }) : I.wt >= 2 ? t('home.tagMorning') : ''
  const set = (key: keyof SafetyInputs) => (v: number) => engine.setInput(key, v)
  const tg = useG()
  const blocked = snap.inputIssues.required.length > 0
  const guard = (f: keyof typeof SAFETY_RANGES, label: string, value: number | null) => (
    <FieldGuard snap={snap} r={r} subject="safety" field={f} label={label} value={value} min={SAFETY_RANGES[f].min} max={SAFETY_RANGES[f].max} step={SAFETY_RANGES[f].step} disabled={lock} onSet={(raw) => engine.setInput(f, raw)} />
  )
  const d = S.dec
  const em = !!d?.path && /_em$/.test(d.path)
  const Q = S.qk ? QUESTIONS[S.qk] : null
  const showSpeech = S.phase === 'check' || (S.phase === 'decided' && S.tCheck != null)
  const live = S.phase === 'playing' ? t('home.live.playing') : S.phase === 'check' ? t('home.live.check', { n: nm }) : d ? t('home.live.decided', { rule: d.rule, name: r(d.name) }) : ''

  return (
    <>
      <p>{t('home.intro')}</p>
      <div className="sr" role="status" aria-live="polite">{live}</div>
      <YourTurn mode="ind" what={t('home.enter')} r={r}>
        <div className="met">
          <Range label={t('home.hr', { at: hm(S.start + 10) })} value={I.hr} min={45} max={180} unit={t('units.bpm')} disabled={lock} onChange={set('hr')} />
          {guard('hr', t('home.hr', { at: hm(S.start + 10) }), I.hr)}
          <Range label={t('home.dur')} value={I.dur} min={0} max={20} unit={t('units.min')} disabled={lock} onChange={set('dur')} />
          {guard('dur', t('home.dur'), I.dur)}
        </div>
        <Seg label={t('home.motion')} options={[[true, t('home.still')], [false, t('home.moving')]]} value={I.still} disabled={lock} onChange={(v) => engine.setInputToggle('still', v)} />
        <div className="grid2">
          <div>
            <span className="lab">{t('home.fall')}</span>
            <Seg label={t('home.fall')} options={[[false, t('home.no')], [true, t('home.yes')]]} value={I.fall} disabled={lock} onChange={(v) => engine.setInputToggle('fall', v)} />
          </div>
          <div>
            <span className="lab">{t('home.glus')}</span>
            <Seg label={t('home.glus')} options={[[false, t('home.off')], [true, t('home.on')]]} value={I.glu != null} disabled={lock} onChange={(v) => engine.setInputToggle('glus', v)} />
          </div>
        </div>
        <div className="met">
          {I.fall && <><Range label={t('home.floor')} value={I.floor} min={0} max={30} unit={t('units.min')} disabled={lock} onChange={set('floor')} />{guard('floor', t('home.floor'), I.floor)}</>}
          {I.glu != null && <><Range label={t('home.glu')} value={I.glu} min={1.5} max={15} step={0.1} unit={t('units.mmol')} disabled={lock} onChange={set('glu')} />{guard('glu', t('home.glu'), I.glu)}</>}
          {I.glu == null && issuesOf(snap, 'safety', 'glu').length > 0 && <div className="tc-guard"><IssueList issues={issuesOf(snap, 'safety', 'glu')} r={r} /></div>}
          <Range label={t('home.spo2')} value={I.spo2} min={80} max={100} unit={t('units.pct')} disabled={lock} onChange={set('spo2')} />
          {guard('spo2', t('home.spo2'), I.spo2)}
          <Range label={t('home.wt')} value={I.wt} min={-2} max={4} step={0.1} unit={t('units.kg')} disabled={lock} onChange={set('wt')} />
          {guard('wt', t('home.wt'), I.wt)}
        </div>
        <div className="chartbox"><Chart snap={snap} tagText={tag} /></div>
        <div className="tc-provrow"><ProvTag kind="observed" /><span>{tg('prov.homeReadings')}</span></div>
        <div className="nums" dir="ltr">
          <span>{hm(S.clock)}</span>
          <span>{last != null ? `${last} ${t('units.bpm')}` : '—'}</span>
          <span>{t('home.r1', { n: Math.min(k, 10) })}</span>
        </div>
        {S.phase === 'setup' ? (
          <>
            <button type="button" className="btn" disabled={snap.busy || blocked} aria-describedby={blocked ? 'tc-blocked' : undefined} onClick={() => engine.play()}><Glyph name="play" />{t('home.play')}</button>
            {blocked && <p id="tc-blocked" className="tc-issue is-required"><b>{tg('issue.required')}</b> {tg('issue.blocked')}</p>}
          </>
        ) : S.phase === 'playing' ? (
          <button type="button" className="btn" disabled>{t('home.playing')}</button>
        ) : (
          <button type="button" className="btn ghost sm" disabled={snap.busy} onClick={() => engine.replay()}>{t('home.replay')}</button>
        )}
      </YourTurn>

      {showSpeech && (
        <SpeechCheck
          engine={engine} snap={snap} r={r} which="home" sample={['slurred', 'usual', 'none']}
          title={t('home.speechTitle', { n: nm })}
          ask={t('speech.ask', { at: hm(S.tCheck ?? S.clock), q: r(tx((Q ?? QUESTIONS.hr).q)) })}
        />
      )}
      {showSpeech && Q && S.speech.home?.said && (
        <YourTurn mode="ind" what={t('home.answerTitle')} r={r}>
          <p id="tc-q">{r(tx(Q.q))}</p>
          <div role="group" aria-labelledby="tc-q" className="opts">
            {Q.a.map((a) => (
              <button key={a.id} type="button" className={`opt${S.ans === a.id ? ' right' : ''}`} aria-pressed={S.ans === a.id} disabled={S.phase === 'decided'} onClick={() => engine.answer(a.id)}>
                {r(tx(a.label))}
              </button>
            ))}
          </div>
        </YourTurn>
      )}

      {d && (
        <div className="decision">
          <div className={`result status ${em ? 'st-red' : d.path ? 'st-amber' : 'st-green'}`}>
            <b>{t('home.decision', { rule: d.rule, name: r(d.name) })}</b> <ProvTag kind="calculated" />
            {d.why ? r(d.why) : em ? t('home.called', { at: hm((S.tAct ?? 0) + 2) }) : snap.steps[1] ? t('home.nextIs', { title: r(tx(snap.steps[1].title)) }) : ''}
          </div>
          <div className="checks">
            <span className="lab">{t('home.checksTitle')}</span>
            <ul>{engine.decisionChecks().map((c, i) => <li key={i}>✓ {r(c)}</li>)}</ul>
          </div>
          {!d.path && <p className="note">{t('home.tryAnother')}</p>}
        </div>
      )}

      <details className="rules" open={!!d}>
        <summary>{t('home.rules')}</summary>
        <table>
          <thead className="sr"><tr><th>{t('home.ruleId')}</th><th>{t('home.ruleWhen')}</th><th>{t('home.ruleThen')}</th></tr></thead>
          <tbody>
            {RULES.map((ru) => (
              <tr key={ru.id} className={d && (ru.id === d.rule || ru.id === S.why1) ? 'hit' : ''}>
                <td>{ru.id}</td><td>{r(tx(ru.when))}</td><td>{r(tx(ru.then))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}
