'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Condition, Kpi as KpiData } from '@/data/types'
import { KpiDrawerBody as SharedKpiDrawerBody } from '../../shared/drawers'
import { Actions, Kv } from './parts'

const glassBubble = { background: 'rgba(255,255,255,.92)' }

/** "Ask the agent" drawer body (prototype `DR.chat` + `ANS`): each question can be asked once. */
export function ChatDrawerBody() {
  const { t } = useTranslation()
  const [asked, setAsked] = useState<number[]>([])
  const qa = t('chatQa', { returnObjects: true })
  return (
    <>
      <div id="chatlog" style={{ display: 'grid', gap: 8 }}>
        <div className="bubble" style={glassBubble}>{t('chatIntro')}</div>
        {asked.map((i) => (
          <div key={i} style={{ display: 'contents' }}>
            <div className="bubble me">{qa[i]?.[0]}</div>
            <div className="bubble" style={glassBubble}>{qa[i]?.[1]}</div>
          </div>
        ))}
      </div>
      <div className="qs">
        {qa.map(([q], i) =>
          asked.includes(i) ? null : (
            <button key={q} type="button" onClick={() => setAsked((a) => [...a, i])}>{q}</button>
          ),
        )}
      </div>
    </>
  )
}

/** Condition detail drawer body (prototype `data-cond` click handler). */
export function ConditionDrawerBody({ condition: c }: { condition: Condition }) {
  const { t } = useTranslation(['home', 'common'])
  return (
    <>
      <Kv rows={[[t('condition.since'), c.since], [t('condition.rightNow'), c.now, c.color]]} />
      <p style={{ fontSize: 14, lineHeight: 1.55 }}>{c.detail}</p>
      <Actions list={t('common:condActions', { returnObjects: true })} />
    </>
  )
}

/** KPI tile drawer body (prototype `.kpi` click handler, individual view). */
export function KpiDrawerBody({ kpi }: { kpi: KpiData }) {
  const { t } = useTranslation('home')
  return (
    <SharedKpiDrawerBody
      kpi={kpi}
      explainLabel={`${kpi.emoji ?? ''}${kpi.label}`}
      fallback="individual"
      actions={t('drawer.kpi', { returnObjects: true })}
    />
  )
}
