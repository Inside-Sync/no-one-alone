'use client'

import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useRouter } from '@/app/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import type { Forecast } from '@/data/types'
import { Head, MiniGrid } from './parts'

/** `🔮 Coming up` (c7): the one thing to act on, then "This week's plan" with an Approve button on tasks that need it. */
export function ComingUpCard({ forecast }: { forecast: Forecast }) {
  const { t } = useTranslation(['home', 'common'])
  const router = useRouter()
  const onceLabels = t('common:onceLabels', { returnObjects: true }) as Record<string, string | undefined>
  const toast = useToast()
  const [approved, setApproved] = useState<ReadonlySet<string>>(new Set())
  const { comingUp: up } = forecast
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
            <OnceButton key={a.label} className={a.soft ? 'soft' : ''} toast={a.value} done={onceLabels[a.label] ?? `✓ ${a.label}`}>
              {a.icon && <span className="ic"><Icon name={a.icon} /></span>}{a.label}
            </OnceButton>
          ) : (
            <button key={a.label} type="button" className={a.soft ? 'btn soft' : 'btn'} onClick={() => router.push(`/individual/${a.value}`)}>{a.label}</button>
          ),
        )}
      </div>
      <Head title={t('plan.title')} meta={forecast.weeklyPlanMeta} small />
      <ul className="list">
        {forecast.weeklyPlan.map((task) => {
          // A task awaiting approval is the one with the warn tone (its text is translated, so it is not compared).
          const needs = task.status.tone === 'warn' && !approved.has(task.title)
          const status = approved.has(task.title) ? { tone: 'good' as const, text: t('plan.approve.done') } : task.status
          return (
            <li key={task.title}>
              <span className="li" style={task.iconColor ? { color: task.iconColor } : undefined}><span className="ic"><Icon name={task.icon} /></span></span>
              <span><b>{task.title}</b><small>{task.note}</small></span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Pill tone={status.tone}>{status.text}</Pill>
                {needs && (
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      toast(t('plan.approve.toast'))
                      setApproved((s) => new Set(s).add(task.title))
                    }}
                  >
                    {t('plan.approve.label')}
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
