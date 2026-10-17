'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { ALERT_MIN, HR_MAX, HR_MIN, PRESETS, STILL_MAX, type PresetId, type SimSettings, type SimSpeech } from '@/domain/simulator'
import { Head } from '../home/parts'
import type { WatchApi } from './useWatch'

const SPEECH: SimSpeech[] = ['slurred', 'mic']
const PRESET_IDS = Object.keys(PRESETS) as PresetId[]

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

/** Live mode (c12, one row like the prototype's): presets and sliders drive the watch; Noa starts the real incident when the rule is met. Locked while one is open. */
export function SimulatorCard({ watch: api, settings: s, onChange, locked, onReset }: {
  watch: WatchApi; settings: SimSettings; onChange: (s: SimSettings) => void; locked: boolean; onReset: () => void
}) {
  const { t } = useTranslation('live')
  const { watch: w } = api
  const set = (patch: Partial<SimSettings>) => onChange({ ...s, ...patch })
  const still = w.stillMin === 0 ? t('sim.moving') : t(w.stillMin >= ALERT_MIN ? 'sim.minAlert' : 'sim.min', { n: w.stillMin })
  return (
    <GlassCard span={12} id="simCard">
      <Head title={t('sim.title')} meta={t('sim.meta')} />
      <div className="sim-wide">
        <ol className="howto">
          {(t('sim.howto', { returnObjects: true }) as string[]).map((h) => (
            // `**word**` is the prototype's <strong>.
            <li key={h}><span>{h.split('**').map((part, k) => (k % 2 ? <strong key={k}>{part}</strong> : part))}</span></li>
          ))}
        </ol>
        <div className="sim">
          <div className="row">
            {PRESET_IDS.map((id) => (
              <button key={id} type="button" className={api.preset === id ? 'btn sm' : 'btn sm soft'} aria-pressed={api.preset === id} disabled={locked}
                onClick={() => api.loadPreset(id)}>{t(`sim.preset.${id}`)}</button>
            ))}
          </div>
          <label>
            <span className="lv"><span>{t('sim.hr')}</span><b>{t('sim.bpm', { n: w.hr })}</b></span>
            <input type="range" min={HR_MIN} max={HR_MAX} value={w.hr} aria-label={t('sim.hrAria')} disabled={locked}
              onChange={(e) => api.setHr(Number(e.target.value))} />
          </label>
        </div>
        <div className="sim">
          <label>
            <span className="lv"><span>{t('sim.still')}</span><b>{still}</b></span>
            <input type="range" min={0} max={STILL_MAX} step={1} value={w.stillMin} aria-label={t('sim.stillAria')} disabled={locked}
              style={{ accentColor: '#0b7f71' }} onChange={(e) => api.setStill(Number(e.target.value))} />
            <span className="fine" style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)' }}>
              <span>0</span><span>5</span><b style={{ color: 'var(--bad)' }}>{t('sim.alertTick')}</b><span>{STILL_MAX}</span>
            </span>
          </label>
          <details className="more">
            <summary>{t('sim.more')}</summary>
            <Toggle label={t('sim.speech')} value={s.speech} disabled={locked} onChange={(speech) => set({ speech })}
              options={SPEECH.map((v) => ({ v, text: t(`sim.speechOpt.${v}`) }))} />
            <Toggle label={t('sim.david')} value={s.davidPicksUp} disabled={locked} onChange={(davidPicksUp) => set({ davidPicksUp })}
              options={[{ v: true, text: t('sim.yes') }, { v: false, text: t('sim.no') }]} />
          </details>
        </div>
        <div className="btns">
          <button type="button" className="btn" title={t('sim.runTitle')} disabled={locked} onClick={api.toggleRun}>
            {t(api.running ? 'sim.pause' : 'sim.resume')}
          </button>
          <button type="button" className="btn soft" disabled={locked} onClick={api.toggleFast}>{t(api.fast ? 'sim.normal' : 'sim.faster')}</button>
          <button type="button" className="btn soft" onClick={onReset}>{t('sim.reset')}</button>
        </div>
      </div>
    </GlassCard>
  )
}
