'use client'

import { useState } from 'react'
import { CHAT_INTRO, CHAT_QA, COND_ACTIONS } from '@/data/repo'
import type { Condition, Kpi as KpiData } from '@/data/types'
import { Sparkline } from '@/components/charts/Sparkline'
import { Actions, Kv, explainFor } from './parts'

const glassBubble = { background: 'rgba(255,255,255,.92)' }

/** "Ask the agent" drawer body (prototype `DR.chat` + `ANS`): each question can be asked once. */
export function ChatDrawerBody() {
  const [asked, setAsked] = useState<number[]>([])
  return (
    <>
      <div id="chatlog" style={{ display: 'grid', gap: 8 }}>
        <div className="bubble" style={glassBubble}>{CHAT_INTRO}</div>
        {asked.map((i) => (
          <div key={i} style={{ display: 'contents' }}>
            <div className="bubble me">{CHAT_QA[i][0]}</div>
            <div className="bubble" style={glassBubble}>{CHAT_QA[i][1]}</div>
          </div>
        ))}
      </div>
      <div className="qs">
        {CHAT_QA.map(([q], i) =>
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
  return (
    <>
      <Kv rows={[['Since', c.since], ['Right now', c.now, c.color]]} />
      <p style={{ fontSize: 14, lineHeight: 1.55 }}>{c.detail}</p>
      <Actions list={COND_ACTIONS} />
    </>
  )
}

/** KPI tile drawer body (prototype `.kpi` click handler, individual view). */
export function KpiDrawerBody({ kpi }: { kpi: KpiData }) {
  return (
    <>
      <div className="dr-big"><b>{kpi.value}{kpi.unit !== '' && <small>{kpi.unit}</small>}</b></div>
      <div className="dr-chart"><Sparkline values={kpi.spark} color={kpi.color} decorative /></div>
      <Kv rows={[['Compared with', kpi.baseline], ['Change', kpi.delta]]} />
      <p style={{ fontSize: 14, lineHeight: 1.55 }}>{explainFor(`${kpi.emoji ?? ''}${kpi.label}`)}</p>
      <Actions list={[['🗣️ Ask her about it', 'Added to her next chat at 18:00', 'Added'], ['📤 Share with family', 'Shared with David and Sarah', 'Shared']]} />
    </>
  )
}
