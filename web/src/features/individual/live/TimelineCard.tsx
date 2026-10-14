'use client'

import { Icon } from '@/components/ui/Icon'
import { GlassCard } from '@/components/ui/GlassCard'
import { LIVE_COPY } from '@/data/repo'
import { SLA, STEPS } from '@/domain/emergency'

const medium = { fontWeight: 500 } as const

interface Props {
  step: number
  playing: boolean
  onPrev: () => void
  onNext: () => void
  onTogglePlay: () => void
}

/** `Live timeline` (c4): the ten steps, the player and the response-time (SLA) tiles. */
export function TimelineCard({ step, playing, onPrev, onNext, onTogglePlay }: Props) {
  const c = LIVE_COPY
  return (
    <GlassCard span={4} id="liveB">
      <div className="ch"><h2>{c.timeline.title}</h2><span className="meta">{c.timeline.meta}</span></div>
      <ol className="tl" id="tl">
        {STEPS.map((x, k) => (
          <li key={k} className={(k <= step ? 'done' : '') + (k === step ? ' cur' : '')}>
            <span className="tm">{x.t}</span>
            <span className="dot"></span>
            <span><b style={medium}>{x.ph}.</b> {x.d}<small>{x.s}</small></span>
          </li>
        ))}
      </ol>
      <div className="player">
        <button type="button" className="pb" id="pPrev" aria-label={c.player.prev} disabled={step === 0} onClick={onPrev}>
          <span className="ic"><Icon name="left" /></span>
        </button>
        <button type="button" className="pb" id="pPlay" aria-label={playing ? c.player.pause : c.player.play} onClick={onTogglePlay}>
          <span className="ic"><Icon name={playing ? 'pause' : 'play'} /></span>
        </button>
        <div className="pdots" id="pDots">
          {STEPS.map((_, k) => <i key={k} className={k === step ? 'on' : ''}></i>)}
        </div>
        <button type="button" className="pb" id="pNext" aria-label={c.player.next} disabled={step === STEPS.length - 1} onClick={onNext}>
          <span className="ic"><Icon name="right" /></span>
        </button>
      </div>
      <div className="sla" id="sla">
        {SLA.map(([label, value, at]) => {
          const on = step >= at
          return <div key={label}><small>{label}</small><b style={{ color: on ? '#9ff0de' : 'var(--muted)' }}>{on ? value : '—'}</b></div>
        })}
      </div>
    </GlassCard>
  )
}
