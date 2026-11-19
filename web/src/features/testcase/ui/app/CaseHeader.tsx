'use client'

import { Icon } from '@/components/ui/Icon'
import { CASES } from '../../data/cases'
import { tx, type Lang } from '../../engine'
import { JUDGE_BEATS } from './driver'
import { useToast } from './toast'
import { tokText, useAd, type SessionProps } from './parts'

/** The compact Y7 lines of a case: the moment that matters, and the "How might we". */
export function Brief({ id }: { id: string }) {
  const t = useAd()
  return (
    <div className="tc-brief">
      <p><span className="lab">{t('brief.momentLab')}</span> {t(`brief.${id}.moment`)}</p>
      <p><span className="lab">{t('brief.hmwLab')}</span> {t(`brief.${id}.hmw`)}</p>
    </div>
  )
}

/** The Judge path caption: which beat is on, and its "pain / magic" line. */
function JudgeCaption({ s }: SessionProps) {
  const t = useAd()
  const j = s.judge
  if (!j) return null
  const beat = Math.min(j.beat, JUDGE_BEATS.length - 1)
  return (
    <div className="tc-judgecap" role="status">
      {j.phase === 'done' ? (
        <p><b>{t('judgePath.done')}</b> {t('judgePath.doneNext')}</p>
      ) : (
        <>
          <p className="tc-jc-h"><span className="pill p-demo">{t('judgePath.beatOf', { n: j.beat + 1, total: j.total })}</span> <b>{t(`judgePath.beats.${beat}.title`)}</b>{j.phase === 'pause' ? <span className="src"> · {t('judgePath.next')}</span> : null}</p>
          <p><span className="lab tc-pain">{t('judgePath.pain')}</span> {t(`judgePath.beats.${beat}.pain`)}</p>
          <p><span className="lab tc-magic">{t('judgePath.magic')}</span> {t(`judgePath.beats.${beat}.magic`)}</p>
        </>
      )}
    </div>
  )
}

/** The case header (prototype `.case`): who and what, the one-liner (the brief shows with details), language, Judge path, "Run it for me", Restart, "Show details". */
export function CaseHeader({ s }: SessionProps) {
  const t = useAd()
  const { engine, snap, r } = s
  const S = snap.state
  const c = CASES[S.ck]
  const full = tokText(s, 'full')
  const title = engine.isFam ? t('header.family') : `${full}, ${tokText(s, 'age')}${S.ck === 'own' ? ` · ${t('header.own')}` : ` · ${r(tx(c.title))}`}`
  const sub = engine.isFam
    ? t('header.familyText')
    : t('header.facts', { meds: tokText(s, 'meds'), hist: tokText(s, 'hist'), usual: tokText(s, 'usual') })
  const toast = useToast()
  const setLang = (l: Lang) => {
    engine.setLang(l)
    if (S.lang !== l) toast(t(`toast.speak.${l}`))
  }
  return (
    <>
      <div className="tc-case-main">
        <h2>{title}</h2>
        <p>{sub}</p>
        <p className="tc-oneliner">{t(`brief.${S.ck}.one`)}</p>
        <Brief id={S.ck} />
      </div>
      <div className="tc-case-actions">
        <span className="tc-langlab" aria-hidden="true">{t('header.langShort')}</span>
        <div className="langsw" role="group" aria-label={t('header.langLabel')} title={t('header.langLabel')}>
          {(['en', 'ar'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={S.lang === l} lang={l} onClick={() => setLang(l)}>{t(`header.lang.${l}`)}</button>
          ))}
        </div>
        <button type="button" className="btn" id="judgeBtn" disabled={!!s.judge && s.judge.phase !== 'done'} onClick={s.startJudge}>
          <span className="ic" aria-hidden="true"><Icon name="target" /></span> {t('header.judge')}
        </button>
        <button type="button" className="btn ghost sm" id="autoBtn" aria-pressed={S.auto} onClick={s.toggleAuto}>
          {S.auto ? <><span className="ic" aria-hidden="true"><Icon name="stop" /></span> {t('header.stop')}</> : <><span className="ic" aria-hidden="true"><Icon name="play" /></span> {t('header.run')}</>}
        </button>
        <button type="button" className="btn ghost sm" onClick={s.restart}>{t('header.restart')}</button>
        <button type="button" className="btn ghost sm" id="detBtn" aria-pressed={s.details} onClick={() => s.setDetails(!s.details)}>{t(s.details ? 'header.hideDetails' : 'header.showDetails')}</button>
      </div>
      <JudgeCaption s={s} />
    </>
  )
}
