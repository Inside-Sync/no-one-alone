'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/components/ui/Toast'
import { apiErrorCode } from '@/data/repo'
import { NO_REPLY_SECONDS, overridesFor, scenarioFor, type SimSettings, type SimSpeech } from '@/domain/simulator'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { Head } from '../home/parts'

const SPEECH: SimSpeech[] = ['slurred', 'mic']

function Toggle<T extends string | boolean>({ label, value, options, onChange, disabled }: {
  label: string; value: T; options: { v: T; text: string }[]; onChange: (v: T) => void; disabled: boolean
}) {
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span style={{ fontSize: '12.5px' }}>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.v)} type="button" aria-pressed={o.v === value} disabled={disabled} onClick={() => onChange(o.v)}>{o.text}</button>
        ))}
      </div>
    </div>
  )
}

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="lv" style={{ fontSize: '12.5px' }}><span>{label}</span><b>{value}</b></div>
)

/** Live mode (c5): the night alert case and who answers, then start the real agents with it. Locked while an incident is open. */
export function SimulatorCard({ settings: s, onChange, locked, start, onReset }: {
  settings: SimSettings; onChange: (s: SimSettings) => void; locked: boolean; start: LiveIncidentValue['start']; onReset: () => void
}) {
  const toast = useToast()
  const { t } = useTranslation('live')
  const [busy, setBusy] = useState(false)
  const off = locked || busy
  const set = (patch: Partial<SimSettings>) => onChange({ ...s, ...patch })
  const run = () => {
    setBusy(true)
    toast(t('live.starting'))
    start(scenarioFor(), { ...overridesFor(s), noReplySeconds: NO_REPLY_SECONDS })
      .catch((e: unknown) => toast(apiErrorCode(e) === 'INVALID_STATE' ? t('live.busy') : t('live.failed')))
      .finally(() => setBusy(false))
  }
  return (
    <GlassCard span={5} id="simCard">
      <Head title={t('sim.title')} meta={t('sim.meta')} />
      <h3>{t('sim.case')}</h3>
      <div className="sim">
        <Fact label={t('sim.hr')} value={t('sim.bpm', { n: s.hr })} />
        <Fact label={t('sim.stillFor')} value={t('sim.min', { n: s.stillMin })} />
        <Toggle label={t('sim.speech')} value={s.speech} disabled={off} onChange={(speech) => set({ speech })}
          options={SPEECH.map((v) => ({ v, text: t(`sim.speechOpt.${v}`) }))} />
        <Toggle label={t('sim.david')} value={s.davidPicksUp} disabled={off} onChange={(davidPicksUp) => set({ davidPicksUp })}
          options={[{ v: true, text: t('sim.yes') }, { v: false, text: t('sim.no') }]} />
      </div>
      <div className="row">
        <button type="button" className="btn sos" disabled={off} onClick={run}>{t('sim.start')}</button>
        <button type="button" className="btn soft" disabled={busy} onClick={onReset}>{t('live.reset')}</button>
      </div>
    </GlassCard>
  )
}
