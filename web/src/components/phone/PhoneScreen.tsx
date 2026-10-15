'use client'

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
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
  /** Yes / No are shown but inactive (a reply is being processed). */
  disabled?: boolean
  /** Initials on the helper bubble. */
  helpInitials?: string
  onAnswer: (answer: string) => void
  /** The live screen's voice reply button (one big toggle: start, then send). */
  record?: { label: string; recording: boolean; disabled?: boolean; onClick: () => void }
}

/** Margaret's phone in hearing mode (`#devLive`, prototype `renderEm`): one question, big text, big buttons. */
export function PhoneScreen({ time, q, small, flash, listen, help, yn, disabled, helpInitials = 'D', onAnswer, record }: Props) {
  const { t } = useTranslation('live')
  const yes = t('phone.yes')
  const no = t('phone.no')
  return (
    <div className={`device ${s.frame}`}>
      <div className={`dev-screen dark ${s.screen}`} id="devLive">
        <div className={flash ? 'dev-flash on' : 'dev-flash'}></div>
        <span className={`dev-h ${s.h}`}>{t('phone.header', { time })}</span>
        <div className={`dev-q ${s.q}`}>
          {q}
          {small && <><br /><small className={s.small}>{small}</small></>}
        </div>
        {listen && <div className="listen"><i></i><i></i><i></i><i></i><i></i></div>}
        {help && (
          <div className={`dev-help ${s.help}`}>
            <span className="av sm" style={{ '--c': '#2f6fb0' } as CSSProperties}>{helpInitials}</span>
            {help}
          </div>
        )}
        {yn && (
          <div className="dev-btns">
            <button type="button" className={`dev-b ok ${s.btn}`} disabled={disabled} onClick={() => onAnswer(yes)}>
              <span className="ic"><Icon name="check" /></span>{yes}
            </button>
            <button type="button" className={`dev-b help ${s.btn}`} disabled={disabled} onClick={() => onAnswer(no)}>
              <span className="ic"><Icon name="x" /></span>{no}
            </button>
          </div>
        )}
        {record && (
          <div className="dev-btns">
            <button type="button" className={`dev-b ${record.recording ? 'help' : 'ok'} ${s.btn}`} disabled={record.disabled} aria-pressed={record.recording} onClick={record.onClick}>
              <span className="ic"><Icon name="mic" /></span>{record.label}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
