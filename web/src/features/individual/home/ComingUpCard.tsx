'use client'

import { useState } from 'react'
import { useRouter } from '@/app/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import { HOME_COPY, ONCE_LABELS } from '@/data/repo'
import type { Forecast } from '@/data/types'
import { Head, MiniGrid } from './parts'

/** `🔮 Coming up` (c7): the one thing to act on, then "This week's plan" with an Approve button on tasks that need it. */
export function ComingUpCard({ forecast }: { forecast: Forecast }) {
  const router = useRouter()
  const toast = useToast()
  const [approved, setApproved] = useState<ReadonlySet<string>>(new Set())
  const { comingUp: up } = forecast
  const c = HOME_COPY.plan
  return (
    <GlassCard span={7}>
      <Head title={up.title} meta={up.meta}><Pill tone={up.pill.tone}>{up.pill.text}</Pill></Head>
      <p className="ah-t">{up.headline}</p>
      <MiniGrid stats={up.stats} />
      <ul className="why">
        {up.reasons.map((r) => (
          <li key={r.text}><span className="ic"><Icon name={r.icon} /></span><span>{r.text}</span></li>
        ))}
      </ul>
      <div className="row">
        {up.actions.map((a) =>
          a.kind === 'toast' ? (
            <OnceButton key={a.label} className={a.soft ? 'soft' : ''} toast={a.value} done={ONCE_LABELS[a.label] ?? `✓ ${a.label}`}>
              {a.icon && <span className="ic"><Icon name={a.icon} /></span>}{a.label}
            </OnceButton>
          ) : (
            <button key={a.label} type="button" className={a.soft ? 'btn soft' : 'btn'} onClick={() => router.push(`/individual/${a.value}`)}>{a.label}</button>
          ),
        )}
      </div>
      <Head title={c.title} meta={forecast.weeklyPlanMeta} small />
      <ul className="list">
        {forecast.weeklyPlan.map((t) => {
          const needs = t.status.text === 'Needs approval' && !approved.has(t.title)
          const status = approved.has(t.title) ? { tone: 'good' as const, text: c.approve.done } : t.status
          return (
            <li key={t.title}>
              <span className="li" style={t.iconColor ? { color: t.iconColor } : undefined}><span className="ic"><Icon name={t.icon} /></span></span>
              <span><b>{t.title}</b><small>{t.note}</small></span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Pill tone={status.tone}>{status.text}</Pill>
                {needs && (
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      toast(c.approve.toast)
                      setApproved((s) => new Set(s).add(t.title))
                    }}
                  >
                    {c.approve.label}
                  </button>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}
