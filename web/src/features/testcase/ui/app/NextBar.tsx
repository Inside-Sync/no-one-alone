'use client'

import { useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { canAutoStep, tx } from '../../engine'
import { SPEEDS } from './driver'
import { nextHint } from './nextHint'
import { useAd, type SessionProps } from './parts'

/** Space pauses and resumes, unless the focus is on something that uses the key itself. */
const ownsSpace = (el: EventTarget | null): boolean => {
  const n = el as HTMLElement | null
  if (!n || !n.tagName) return false
  if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(n.tagName) || n.isContentEditable) return true
  const role = n.getAttribute?.('role')
  return role === 'tab' || role === 'button' || role === 'slider' || role === 'switch' || role === 'checkbox' || role === 'radio'
}

/** The arrow keys move through the case (prototype): not while typing, or on a control that uses them (tabs, sliders, radios). */
const ownsArrows = (el: EventTarget | null): boolean => {
  const n = el as HTMLElement | null
  if (!n || !n.tagName) return false
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.isContentEditable) return true
  const role = n.getAttribute?.('role')
  if (role === 'tab' || role === 'slider' || role === 'radio' || role === 'menuitem' || role === 'option') return true
  // A scrollable table or list scrolls sideways with them.
  return !!n.closest?.('.tblw,.loglist,[role="region"],[role="log"]')
}

/**
 * The sticky bar at the bottom of the step view (prototype `.nextbar`). By hand it is Back, "Step n of N" with what Next does, and Next,
 * which does that one action (prototype stepOnce); the arrow keys do Back and Next too.
 * While "Run it for me" or the Judge path runs (or is paused) it holds the player instead: Previous, Play or Pause, one dot per step,
 * Next, and the speed (and "Case n of 3" on the Judge path). Space also toggles Pause.
 */
export function NextBar({ s }: SessionProps) {
  const t = useAd()
  const { engine, playback: pb, snap, judge, r, stepOnce } = s
  const { active, toggle, skip, back } = pb
  const step = snap.state.step
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      if (ownsArrows(e.target)) return
      const host = document.getElementById('nextbar')
      if (!host || host.offsetParent === null) return
      // Next is the reading direction: right in English, left in Arabic.
      const rtl = getComputedStyle(host).direction === 'rtl'
      const forward = (e.key === 'ArrowRight') !== rtl
      e.preventDefault()
      if (active) { if (forward) skip(); else back() }
      else if (forward) stepOnce()
      else if (step > 0) engine.go(step - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [engine, stepOnce, step, active, skip, back])
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== ' ' && e.key !== 'Spacebar') || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      if (ownsSpace(e.target)) return
      e.preventDefault()
      e.stopPropagation() // not a hand scroll: the run keeps being followed
      toggle()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [active, toggle])

  const total = snap.steps.length
  const i = snap.state.step
  const st = snap.step
  const mode = `mode-${st.mode}`
  // "of N" only once Noa has decided the path: before that step 1 is all there is (prototype).
  const kicker = total > 1 ? t('nextbar.step', { n: i + 1, total, title: r(tx(st.title)) }) : t('nextbar.stepOnly', { n: i + 1, title: r(tx(st.title)) })
  const hint = nextHint(engine, snap, t, r)

  if (active) {
    const first = i === 0 && (!judge || judge.beat === 0)
    return (
      <div className={`nextbar tc-run ${mode}`} id="nextbar">
        <div className="player" id="tcPlayback" role="group" aria-label={t('playback.label')}>
          <button type="button" className="pb" id="pbBack" disabled={first} aria-label={t('playback.prevAria')} title={t('playback.backAria')} onClick={pb.back}>
            <span className="ic flip" aria-hidden="true"><Icon name="left" /></span>
          </button>
          <button type="button" className="pb" id="pbPause" aria-label={t(pb.paused ? 'playback.playAria' : 'playback.pauseAria')} title={t('playback.spaceHint')} onClick={pb.toggle}>
            <span className="ic" aria-hidden="true"><Icon name={pb.paused ? 'play' : 'pause'} /></span>
          </button>
          <span className="pdots" aria-hidden="true">
            {snap.steps.map((_, k) => <i key={k} className={k === i ? 'on' : undefined} />)}
          </span>
          <button type="button" className="pb" id="pbSkip" aria-label={t('playback.nextAria')} title={t('playback.skipAria')} onClick={pb.skip}>
            <span className="ic flip" aria-hidden="true"><Icon name="right" /></span>
          </button>
        </div>
        {/* One line each inside the pill (ellipsis); the whole text is in the tooltip. */}
        <div className="nb-t" title={`${kicker}
${hint}`}>
          <span className="lab">{kicker}</span>
          <b>{hint}</b>
        </div>
        {(judge || pb.paused) && (
          <span className="nb-prog">
            {judge && <b>{t('playback.caseOf', { n: Math.min(judge.beat + 1, judge.total), total: judge.total })}</b>}
            {pb.paused && <span className="nb-paused">{t('playback.paused')}</span>}
          </span>
        )}
        <span className="nb-speed" role="group" aria-label={t('playback.speed')}>
          {SPEEDS.map((v) => (
            <button key={v} type="button" data-speed={v} aria-pressed={pb.speed === v} onClick={() => pb.setSpeed(v)}>{t(`playback.${v}`)}</button>
          ))}
        </span>
        <span className="sr" role="status" aria-live="polite">{pb.paused ? t('playback.state') : t('playback.stateResumed')}</span>
      </div>
    )
  }

  // By hand: Next does the step's next action (prototype stepOnce); it is off only while Noa works or when there is nothing left to do.
  return (
    <div className={`nextbar ${mode}`} id="nextbar">
      <button type="button" className="btn ghost sm" data-act="stepback" disabled={i === 0} aria-label={t('nextbar.backAria')} onClick={() => engine.go(i - 1)}>
        <span className="ic flip" aria-hidden="true"><Icon name="left" /></span> {t('card.back')}
      </button>
      <div className="nb-t">
        <span className="lab">{kicker}</span>
        <b id="tc-nextwhy">{hint}</b>
      </div>
      <button type="button" className="btn" data-act="stepnext" disabled={!canAutoStep(engine)} aria-describedby="tc-nextwhy" onClick={stepOnce}>
        {t('nextbar.nextBtn')} <span className="ic flip" aria-hidden="true"><Icon name="right" /></span>
      </button>
    </div>
  )
}
