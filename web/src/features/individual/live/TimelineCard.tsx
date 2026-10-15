'use client'

import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { GlassCard } from '@/components/ui/GlassCard'
import { emSteps, slaTiles } from '@/domain/emergency'

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
  const { t } = useTranslation('live')
  const steps = emSteps()
  // aria-disabled, not disabled: a disabled button drops keyboard focus to <body> when it reaches an end.
  const atFirst = step === 0
  const atLast = step === steps.length - 1
  return (
    <GlassCard span={4} id="liveB">
      <div className="ch"><h2>{t('timeline.title')}</h2><span className="meta">{t('timeline.meta')}</span></div>
      <ol className="tl" id="tl">
        {steps.map((x, k) => (
          <li key={k} className={(k <= step ? 'done' : '') + (k === step ? ' cur' : '')}>
            <span className="tm">{x.t}</span>
            <span className="dot"></span>
            <span><b style={medium}>{x.ph}.</b> {x.d}<small>{x.s}</small></span>
          </li>
        ))}
      </ol>
      <div className="player">
        <button type="button" className="pb" id="pPrev" aria-label={t('player.prev')} aria-disabled={atFirst} onClick={() => { if (!atFirst) onPrev() }}>
          <span className="ic"><Icon name="left" /></span>
        </button>
        <button type="button" className="pb" id="pPlay" aria-label={playing ? t('player.pause') : t('player.play')} onClick={onTogglePlay}>
          <span className="ic"><Icon name={playing ? 'pause' : 'play'} /></span>
        </button>
        <div className="pdots" id="pDots">
          {steps.map((_, k) => <i key={k} className={k === step ? 'on' : ''}></i>)}
        </div>
        <button type="button" className="pb" id="pNext" aria-label={t('player.next')} aria-disabled={atLast} onClick={() => { if (!atLast) onNext() }}>
          <span className="ic"><Icon name="right" /></span>
        </button>
      </div>
      <div className="sla" id="sla">
        {slaTiles().map(([label, value, at]) => {
          const on = step >= at
          return <div key={label}><small>{label}</small><b style={{ color: on ? '#9ff0de' : 'var(--muted-text)' }}>{on ? value : '—'}</b></div>
        })}
      </div>
    </GlassCard>
  )
}
