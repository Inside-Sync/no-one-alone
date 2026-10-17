'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Slider } from '@/components/ui/Slider'
import { useToast } from '@/components/ui/Toast'
import { apiErrorCode } from '@/data/repo'
import { noReplySecondsFor, overridesFor, presetSettings, scenarioFor, type SimPreset, type SimSettings, type SimSpeech } from '@/domain/simulator'
import type { LiveIncidentValue } from '@/state/LiveIncident'
import { Head } from '../home/parts'

const PRESETS: SimPreset[] = ['night', 'stairs', 'asleep']
const SPEECH: SimSpeech[] = ['clear', 'slurred', 'none']

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

/** Live mode (c5): pick a scenario and the alert values, then start the real agents with them. Locked while an incident is open. */
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
    start(scenarioFor(s), { ...overridesFor(s), noReplySeconds: noReplySecondsFor(s) })
      .catch((e: unknown) => toast(apiErrorCode(e) === 'INVALID_STATE' ? t('live.busy') : t('live.failed')))
      .finally(() => setBusy(false))
  }
  return (
    <GlassCard span={5} id="simCard">
      <Head title={t('sim.title')} meta={t('sim.meta')} />
      <div className="row" role="group" aria-label={t('sim.presets')}>
        {PRESETS.map((p) => (
          <button key={p} type="button" className={p === s.preset ? 'btn sm' : 'btn sm soft'} aria-pressed={p === s.preset} disabled={off} onClick={() => onChange(presetSettings(p))}>
            {t(`sim.preset.${p}`)}
          </button>
        ))}
      </div>
      <div className="sim">
        <Slider min={40} max={180} value={s.hr} label={t('sim.hr')} valueText={t('sim.bpm', { n: s.hr })} disabled={off} onChange={(hr) => set({ hr })} />
        <Toggle label={t('sim.movement')} value={s.moving} disabled={off} onChange={(moving) => set({ moving })}
          options={[{ v: true, text: t('sim.moving') }, { v: false, text: t('sim.notMoving') }]} />
        <Slider min={0} max={45} value={s.stillMin} label={t('sim.stillFor')} valueText={t('sim.min', { n: s.stillMin })} disabled={off || s.moving} onChange={(stillMin) => set({ stillMin })} />
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
