'use client'

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { NoaOrb } from '@/components/noa/NoaOrb'
import s from './phone.module.css'

const helpStyle = { '--c': '#2f6fb0' } as CSSProperties
const callerStyle = { '--c': '#2f6fb0', width: 96, height: 96, fontSize: 36 } as CSSProperties

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
  /** The helper's name: a known one shows their photo on the help bubble. */
  helpName?: string | null
  /** Who is calling while the phone rings: their round photo shows above the text. */
  caller?: string | null
  onAnswer: (answer: string) => void
  /** The live screen's voice reply button (one big toggle: start, then send). */
  record?: { label: string; recording: boolean; disabled?: boolean; onClick: () => void }
  /** No alert: the light bedtime screen with its title (`Goodnight, Margaret`) and the I'm OK / Help me buttons. */
  idle?: { title: string; ok: string; help: string; onOk: () => void; onHelp: () => void; disabled?: boolean }
  /** The prototype's own phone (Emergency page): its frame and text sizes, `01:34 · Hearing mode` instead of a status bar. */
  proto?: boolean
}

/** Margaret's phone in hearing mode (`#devLive`, prototype `renderEm`): one question, big text, big buttons. */
export function PhoneScreen({ time, q, small, flash, listen, help, yn, disabled, helpInitials = 'D', helpName, caller, onAnswer, record, idle, proto }: Props) {
  const { t } = useTranslation('live')
  const { t: tc } = useTranslation()
  const yes = t('phone.yes')
  const no = t('phone.no')
  return (
    <div className={proto ? `device ${s.protoFrame}` : `device ${s.frame}`}>
      <div className={`dev-screen${idle ? '' : ' dark'} ${proto ? s.proto : s.screen}`} id="devLive">
        <div className={flash ? 'dev-flash on' : 'dev-flash'}></div>
        {!proto && <div className={s.status} data-testid="statusbar" aria-hidden="true">
          <span>{time}</span>
          <span className={s.glyphs}>
            <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
            <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 2.2c2.2 0 4.2.8 5.7 2.2l1.2-1.2A9.9 9.9 0 0 0 7.5.5 9.9 9.9 0 0 0 .6 3.2l1.2 1.2a8.2 8.2 0 0 1 5.7-2.2Zm0 3.4c1.3 0 2.4.5 3.3 1.3l1.2-1.2a6.5 6.5 0 0 0-9 0L4.2 6.9a4.8 4.8 0 0 1 3.3-1.3Zm0 3.3L5.8 7.2a2.4 2.4 0 0 1 3.4 0Z" /></svg>
            <svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="16" height="8" rx="1.5" /><path d="M23 4v4a2 2 0 0 0 0-4Z" opacity=".4" /></svg>
          </span>
        </div>}
        {proto && <span className="dev-h">{idle ? time : `${time} · ${tc('hearingMode')}`}</span>}
        {idle ? <span className={`dev-t ${s.t}`}>{idle.title}</span> : !proto && <span className="dev-h">{tc('hearingMode')}</span>}
        {flash && caller && (
          <Avatar name={caller} className={`av ${s.caller}`} style={callerStyle}>{caller[0]}</Avatar>
        )}
        {!idle && <span className={s.noa} data-testid="noa-label"><NoaOrb size={26} /><b>{tc('noa')}</b></span>}
        <div className={`dev-q ${s.q}`}>
          {q}
          {small && <><br /><small className={s.small}>{small}</small></>}
        </div>
        {listen && <div className="listen"><i></i><i></i><i></i><i></i><i></i></div>}
        {help && (
          <div className={`dev-help ${s.help}`}>
            <Avatar name={helpName} className="av sm" style={helpStyle}>{helpInitials}</Avatar>
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
        {idle && (
          <div className={`dev-btns ${s.idleBtns}`}>
            <button type="button" className={`dev-b ok ${s.btn}`} disabled={idle.disabled} onClick={idle.onOk}>
              <span className="ic"><Icon name="check" /></span>{idle.ok}
            </button>
            <button type="button" className={`dev-b help ${s.btn}`} disabled={idle.disabled} onClick={idle.onHelp}>
              <span className="ic"><Icon name="phone" /></span>{idle.help}
            </button>
          </div>
        )}
        {!proto && <i className={s.home} aria-hidden="true"></i>}
      </div>
    </div>
  )
}
