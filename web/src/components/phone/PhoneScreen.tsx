'use client'

import type { CSSProperties } from 'react'
import { Icon } from '@/components/ui/Icon'
import { LIVE_COPY } from '@/data/repo'
import s from './phone.module.css'

interface Props {
  time: string
  /** The question, mirrored from the agent. */
  q: string
  small?: string
  flash?: boolean
  listen?: boolean
  /** Who is helping, e.g. `David · 6 min away`. */
  help?: string | null
  /** Show the Yes / No buttons. */
  yn?: boolean
  onAnswer: (answer: string) => void
}

/** Margaret's phone in hearing mode (`#devLive`, prototype `renderEm`): one question, big text, big buttons. */
export function PhoneScreen({ time, q, small, flash, listen, help, yn, onAnswer }: Props) {
  const c = LIVE_COPY.phone
  return (
    <div className={`device ${s.frame}`}>
      <div className={`dev-screen dark ${s.screen}`} id="devLive">
        <div className={flash ? 'dev-flash on' : 'dev-flash'}></div>
        <span className={`dev-h ${s.h}`}>{c.header(time)}</span>
        <div className={`dev-q ${s.q}`}>
          {q}
          {small && <><br /><small className={s.small}>{small}</small></>}
        </div>
        {listen && <div className="listen"><i></i><i></i><i></i><i></i><i></i></div>}
        {help && (
          <div className={`dev-help ${s.help}`}>
            <span className="av sm" style={{ '--c': '#2f6fb0' } as CSSProperties}>D</span>
            {help}
          </div>
        )}
        {yn && (
          <div className="dev-btns">
            <button type="button" className={`dev-b ok ${s.btn}`} onClick={() => onAnswer(c.yes)}>
              <span className="ic"><Icon name="check" /></span>{c.yes}
            </button>
            <button type="button" className={`dev-b help ${s.btn}`} onClick={() => onAnswer(c.no)}>
              <span className="ic"><Icon name="x" /></span>{c.no}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
