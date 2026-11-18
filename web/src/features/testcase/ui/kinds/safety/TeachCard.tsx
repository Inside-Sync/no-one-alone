import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Glyph, Icon } from '@/components/ui/Icon'
import { tx } from '../../../engine'
import { langAttrs, useSpeakResolve } from '../langText'
import type { KindProps } from '../types'
import { Done, YourTurn } from './Controls'
import { useSpeech } from './useSpeech'

/**
 * Teach-back: Noa Coach explains in plain words (English or Arabic, read aloud on request), the person answers a
 * question in their own words, then chooses who sees the plan. Wrong answers get a gentle second explanation.
 */
export function TeachCard({ engine, snap, step, r }: KindProps) {
  const { t } = useTranslation('tcSafety')
  const S = snap.state
  const e = engine.curExplain()
  const [simpler, setSimpler] = useState(false)
  const rl = useSpeakResolve(engine, snap)
  const sp = useSpeech(S.lang, () => undefined)
  const p = engine.person
  const nm = r(tx(p.t.n!))
  if (!e) return null
  const rtl = langAttrs(S.lang)
  const ok = S.tb === 'ok'
  const wrong = S.tbWrong != null && !ok
  const wrongText = wrong && e.wrong ? rl(e.wrong[S.tbWrong === 0 ? 0 : 1]) : ''

  return (
    <>
      <div className="noamsg" {...rtl}>
        <div>{rl(e.explain)}</div>
        {simpler && <div className="simpler">{rl(e.simpler)}</div>}
        <div className="btnrow">
          {sp.canSpeak && (
            sp.speaking
              ? <button type="button" className="btn ghost sm" onClick={sp.stopSpeaking}>{<span className="ic" aria-hidden="true"><Icon name="stop" /></span>} {t('teach.stop')}</button>
              : <button type="button" className="btn ghost sm" onClick={() => sp.speak(rl(e.explain))}><Glyph name="volume-2" />{t('teach.listen')}</button>
          )}
          <button type="button" className="btn ghost sm" aria-pressed={simpler} onClick={() => setSimpler((v) => !v)}>{t('teach.simpler')}</button>
          <span className="pill s-plan">{t('teach.prepared')}</span>
        </div>
      </div>
      <div className="seg2 teach-lang" role="group" aria-label={t('teach.language')}>
        {(['en', 'ar'] as const).map((l) => (
          <button key={l} type="button" aria-pressed={S.lang === l} lang={l} onClick={() => { sp.stopSpeaking(); engine.setLang(l) }}>{t(`teach.${l}`)}</button>
        ))}
      </div>
      <YourTurn mode={step.mode} what={t('teach.answerAs', { n: nm })} r={r}>
        <p id="tc-teach-q" {...rtl}><b>{rl(e.q)}</b></p>
        <div role="group" aria-labelledby="tc-teach-q" className="opts">
          {e.opts.map((o, j) => (
            <button
              key={`${S.lang}${j}`} type="button" className={`opt ${ok && j === e.correct ? 'right' : S.tbWrong === j ? 'wrong' : ''}`}
              aria-pressed={ok ? j === e.correct : S.tbWrong === j} disabled={ok} onClick={() => engine.answerTeach(j)} {...rtl}
            >{rl(o)}</button>
          ))}
        </div>
        {wrong && <div className="noamsg" role="status" {...rtl}>{wrongText} {rl(e.simpler)}</div>}
        {ok && <Done title={t('teach.passed')}>{t('teach.saved')}</Done>}
      </YourTurn>
      <YourTurn mode={step.mode} what={t('teach.chooses', { n: nm })} r={r}>
        {(['f1', 'f2'] as const).map((f) => (
          <label className="tg" key={f}>
            <input type="checkbox" checked={S.fam[f]} disabled={S.planSent} onChange={(ev) => engine.setPlanShare(f, ev.target.checked)} />
            <span>{r(tx(p.t[f]!))}</span>
          </label>
        ))}
        {S.planSent
          ? <Done title={t('teach.planSent')} />
          : <button type="button" className="btn" disabled={snap.busy} onClick={() => engine.sendPlan()}>{t('teach.sendPlan')}</button>}
      </YourTurn>
    </>
  )
}
