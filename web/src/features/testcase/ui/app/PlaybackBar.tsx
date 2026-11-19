'use client'

import { useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { SPEEDS } from './driver'
import { useA, type SessionProps } from './parts'

/** Space pauses and resumes, unless the focus is on something that uses the key itself. */
const ownsSpace = (el: EventTarget | null): boolean => {
  const n = el as HTMLElement | null
  if (!n || !n.tagName) return false
  if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(n.tagName) || n.isContentEditable) return true
  const role = n.getAttribute?.('role')
  return role === 'tab' || role === 'button' || role === 'slider' || role === 'switch' || role === 'checkbox' || role === 'radio'
}

/**
 * The controls of a run (shown while "Run it for me" or the Judge path is on, or paused): Pause or Resume, Back, Skip, the speed, and
 * where the run is (step of steps, case of cases). Sticky under the overlay bar, next to the step view.
 */
export function PlaybackBar({ s }: SessionProps) {
  const t = useA()
  const { playback: pb, snap, judge } = s
  const { active, toggle } = pb
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
  if (!active) return null
  const total = snap.steps.length
  const step = Math.min(snap.state.step + 1, total)
  return (
    <div className="tc-pb" id="tcPlayback" role="group" aria-label={t('playback.label')}>
      <button type="button" className="btn sm" id="pbPause" aria-pressed={pb.paused} aria-label={t(pb.paused ? 'playback.resumeAria' : 'playback.pauseAria')} onClick={pb.toggle}>
        <span className="ic" aria-hidden="true"><Icon name={pb.paused ? 'play' : 'pause'} /></span> {t(pb.paused ? 'playback.resume' : 'playback.pause')}
      </button>
      <button type="button" className="btn ghost sm" id="pbBack" aria-label={t('playback.backAria')} onClick={pb.back}><span className="arr" aria-hidden="true">‹</span> {t('playback.back')}</button>
      <button type="button" className="btn ghost sm" id="pbSkip" aria-label={t('playback.skipAria')} onClick={pb.skip}>{t('playback.skip')} <span className="arr" aria-hidden="true">›</span></button>
      <span className="tc-pb-prog" aria-live="off">
        <b>{t('playback.stepOf', { n: step, total })}</b>
        {judge && <span>{t('playback.caseOf', { n: Math.min(judge.beat + 1, judge.total), total: judge.total })}</span>}
      </span>
      {pb.paused && <span className="pill s-check tc-pb-state">{t('playback.paused')}</span>}
      <span className="tc-pb-speed" role="group" aria-label={t('playback.speed')}>
        <span className="lab" aria-hidden="true">{t('playback.speed')}</span>
        {SPEEDS.map((v) => (
          <button key={v} type="button" data-speed={v} aria-pressed={pb.speed === v} onClick={() => pb.setSpeed(v)}>{t(`playback.${v}`)}</button>
        ))}
      </span>
      <span className="sr" role="status" aria-live="polite">{pb.paused ? t('playback.state') : t('playback.stateResumed')}</span>
    </div>
  )
}
