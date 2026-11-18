'use client'

import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Glyph } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { FAMILY_MEMBERS } from '../../../data/family'
import type { TFn } from '../../../engine'
import { useP } from './parts'

export interface MomentProps {
  /** The Saturday slot Noa offers (engine text, already resolved). */
  slot: string
  /** The booked slot text once the engine holds the booking, else null. */
  booked: string | null
  /** Why there is nothing to book (not eligible, or he said not now): shown instead of the button. */
  note?: string | null
  /** Khalid's family history as the engine holds it (his `fh` text, already resolved). Without it the story reads it from the same data itself. */
  history?: string
  /** The one tap: calls the engine action. */
  onBook: () => void
}

/**
 * Plan item Y1 (from the pitch advice "poke the pain, then sprinkle the magic"): Khalid's moment told twice.
 * Before Noa is a presentational story; With Noa books for real through `onBook`. Labelled illustrative. The words use Khalid's REAL family
 * history from the engine data (mother's stroke, father's heart attack at 62), never an invented one.
 */
export function Moment({ slot, booked, note, history, onBook }: MomentProps) {
  const t = useP()
  const tc = useTranslation('testcase').t as unknown as TFn
  const fh = history ?? tc(FAMILY_MEMBERS.find((m) => m.id === 'khalid')!.fh)
  const head = useId()
  const [tab, setTab] = useState<'before' | 'with'>('with')
  const steps: [IconName, string][] = [
    ['message-circle', t('moment.before.msg')],
    ['hand', t('moment.before.swipe')],
    ['clock', t('moment.before.weeks')],
    ['triangle-alert', t('moment.before.years')],
  ]
  return (
    <section className="tcp-moment" aria-labelledby={head}>
      <div className="tcp-moment-h">
        <b id={head}>{t('moment.title')}</b>
        <span className="pill p-demo">{t('moment.illustrative')}</span>
      </div>
      <div className="seg2" role="group" aria-label={t('moment.switchLabel')}>
        <button type="button" aria-pressed={tab === 'before'} onClick={() => setTab('before')}>{t('moment.beforeTab')}</button>
        <button type="button" aria-pressed={tab === 'with'} onClick={() => setTab('with')}>{t('moment.withTab')}</button>
      </div>
      {tab === 'before' ? (
        <div className="tcp-story" data-story="before">
          <span className="lab">{t('moment.before.msgFrom')}</span>
          <ol>
            {steps.map(([icon, text], i) => (
              <li key={i} className={i === 3 ? 'bad' : ''}><Glyph name={icon} /><span>{i === 0 ? <q>{text}</q> : text}</span></li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="tcp-story" data-story="with">
          <span className="lab">{t('moment.withNoa.msgFrom')}</span>
          <div className="noamsg">
            <div>{t('moment.withNoa.msg', { history: fh })}</div>
            <div className="tcp-slot"><Glyph name="calendar" /><span><small>{t('moment.withNoa.slot')}</small>{slot}</span></div>
          </div>
          {booked ? (
            <div className="result status st-green" role="status"><b>{t('moment.withNoa.booked', { slot: booked })}</b>{t('moment.withNoa.after')}</div>
          ) : note ? (
            <p className="note" role="status">{note}</p>
          ) : (
            <button type="button" className="btn" onClick={onBook}>{t('moment.withNoa.book')}</button>
          )}
        </div>
      )}
    </section>
  )
}
