'use client'

import { useId, useState } from 'react'
import { Glyph } from '@/components/ui/Icon'
import { useP } from './parts'

export interface QueueRow {
  id: string
  who: string
  finding: string
  team: string
}
type Choice = 'approved' | 'changed' | 'called'

/**
 * Plan item Y2: the doctor's review queue (signal, predict, act, REVIEW). The agent only proposes; the family doctor
 * decides. `onApprove` is the engine action behind "Approve" where the prototype has one (the referral); the other
 * buttons are presentational and confirm inside the overlay.
 */
export function ReviewQueue({ rows, onApprove, approvedIds = [] }: { rows: QueueRow[]; onApprove?: (id: string) => void; approvedIds?: string[] }) {
  const t = useP()
  const head = useId()
  const [picked, setPicked] = useState<Record<string, Choice>>({})
  const choose = (id: string, c: Choice) => {
    if (c === 'approved') onApprove?.(id)
    setPicked((p) => ({ ...p, [id]: c }))
  }
  return (
    <section className="tcp-queue" aria-labelledby={head}>
      <div className="tcp-queue-h">
        <b id={head}><Glyph name="stethoscope" />{t('queue.title')}</b>
        <span className="pill p-demo">{t('illustrative')}</span>
      </div>
      <p className="note">{t('queue.note')}</p>
      {rows.length === 0 && <p className="note">{t('queue.none')}</p>}
      <ul>
        {rows.map((row) => {
          const c: Choice | undefined = approvedIds.includes(row.id) ? 'approved' : picked[row.id]
          return (
            <li key={row.id} className={`tcp-qrow${c ? ' decided' : ''}`}>
              <div className="tcp-qmain">
                <span className="lv lv-amber">{t('queue.flagged')}</span>
                <b>{row.who}</b>
                <span>{row.finding}</span>
                <small>{t('queue.proposes', { what: row.team })}</small>
              </div>
              {c ? (
                <p className="tcp-qdone" role="status"><span className="ic" aria-hidden="true">✓</span> {t(`queue.${c}`)}</p>
              ) : (
                <div className="btnrow" role="group" aria-label={t('queue.rowFor', { who: row.who, finding: row.finding })}>
                  <button type="button" className="btn sm" onClick={() => choose(row.id, 'approved')}>{onApprove ? t('queue.approveAccept') : t('queue.approve')}</button>
                  <button type="button" className="btn sm ghost" onClick={() => choose(row.id, 'changed')}>{t('queue.change')}</button>
                  <button type="button" className="btn sm ghost" onClick={() => choose(row.id, 'called')}>{t('queue.call')}</button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {onApprove && <p className="note">{t('queue.demo')}</p>}
    </section>
  )
}
