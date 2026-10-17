'use client'

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph, Icon, type IconName } from '@/components/ui/Icon'
import { ALERT_HR, ALERT_MIN, HR_MAX, HR_MIN, PRESETS, STILL_MAX, type PresetId, type SimSettings, type SimSpeech } from '@/domain/simulator'
import { Head } from '../home/parts'
import type { WatchApi } from './useWatch'

const SPEECH: SimSpeech[] = ['slurred', 'mic']
const PRESET_IDS = Object.keys(PRESETS) as PresetId[]
const PRESET_ICON: Record<PresetId, IconName> = { night: 'moon', stairs: 'door-stairwell', asleep: 'bed' }
/** The alert threshold's warning sign, after a number. */
const warn = <span className="ic sim-warn"><Icon name="triangle-alert" tint /></span>

function Toggle<T extends string | boolean>({ label, value, options, onChange, disabled }: {
  label: string; value: T; options: { v: T; text: string }[]; onChange: (v: T) => void; disabled: boolean
}) {
  return (
    <div className="sim-opt">
      <span>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.v)} type="button" aria-pressed={o.v === value} disabled={disabled} onClick={() => onChange(o.v)}>{o.text}</button>
        ))}
      </div>
    </div>
  )
}

const pct = (v: number, min: number, max: number) => `${((v - min) / (max - min)) * 100}%`

/** Live mode (c12, one row like the prototype's): presets and sliders drive the watch; Noa starts the real incident when the rule is met. Locked while one is open. */
export function SimulatorCard({ watch: api, settings: s, onChange, locked, onReset }: {
  watch: WatchApi; settings: SimSettings; onChange: (s: SimSettings) => void; locked: boolean; onReset: () => void
}) {
  const { t } = useTranslation('live')
  const { watch: w } = api
  const set = (patch: Partial<SimSettings>) => onChange({ ...s, ...patch })
  const still = w.stillMin === 0 ? t('sim.moving') : t(w.stillMin >= ALERT_MIN ? 'sim.minAlert' : 'sim.min', { n: w.stillMin })
  // The how-to steps tick themselves off as the sliders reach the alert rule; step 3 runs while the alert is open.
  const stepState = (k: number) => (k === 0 ? w.hr > ALERT_HR : k === 1 ? w.stillMin >= ALERT_MIN : false) ? 'done' : k === 2 && locked ? 'cur' : ''
  return (
    <GlassCard span={12} id="simCard">
      <Head icon="sliders-horizontal" title={t('sim.title')} meta={t('sim.meta')} />
      <div className="simc">
        <ol className="howto2">
          {(t('sim.howto', { returnObjects: true }) as string[]).map((h, k) => {
            const st = stepState(k)
            return (
              // `**word**` is the prototype's <strong>.
              <li key={h} className={st}>
                <span className="n">{st === 'done' ? '✓' : k + 1}</span>
                <span>{h.split('**').map((part, j) => (j % 2 ? <strong key={j}>{part}</strong> : part))}</span>
              </li>
            )
          })}
        </ol>
        <div className="sim-ctl">
          <div className="presets">
            {PRESET_IDS.map((id) => {
              const p = PRESETS[id]()
              return (
                <button key={id} type="button" className="preset" aria-label={t(`sim.preset.${id}`)} aria-pressed={api.preset === id} disabled={locked}
                  onClick={() => api.loadPreset(id)}>
                  <b><Glyph name={PRESET_ICON[id]} />{t(`sim.preset.${id}`)}</b>
                  {t('sim.bpm', { n: p.hr })} · {p.stillMin ? t('sim.min', { n: p.stillMin }) : t('sim.moving')}
                </button>
              )
            })}
          </div>
          <label className="slider">
            <span className="top"><span><Glyph name="heart" />{t('sim.hr')}</span><b className={w.hr > ALERT_HR ? 'val hot' : 'val'}>{t('sim.bpm', { n: w.hr })}</b></span>
            <input type="range" className="rng" min={HR_MIN} max={HR_MAX} value={w.hr} aria-label={t('sim.hrAria')} disabled={locked}
              style={{ '--z': pct(ALERT_HR, HR_MIN, HR_MAX), '--v': pct(w.hr, HR_MIN, HR_MAX) } as CSSProperties}
              onChange={(e) => api.setHr(Number(e.target.value))} />
            <span className="ticks">
              <span style={{ left: 0 }}>{HR_MIN}</span>
              <b style={{ left: pct(ALERT_HR, HR_MIN, HR_MAX) }}>{ALERT_HR}{warn}</b>
              <span style={{ left: '100%' }}>{HR_MAX}</span>
            </span>
          </label>
          <label className="slider">
            <span className="top"><span><Glyph name="sofa" />{t('sim.still')}</span><b className={w.stillMin >= ALERT_MIN ? 'val hot' : 'val'}>{still}{w.stillMin >= ALERT_MIN && warn}</b></span>
            <input type="range" className="rng" min={0} max={STILL_MAX} step={1} value={w.stillMin} aria-label={t('sim.stillAria')} disabled={locked}
              style={{ '--z': pct(ALERT_MIN, 0, STILL_MAX), '--v': pct(w.stillMin, 0, STILL_MAX) } as CSSProperties}
              onChange={(e) => api.setStill(Number(e.target.value))} />
            <span className="ticks">
              <span style={{ left: 0 }}>0</span>
              <span style={{ left: pct(5, 0, STILL_MAX) }}>5</span>
              <b style={{ left: pct(ALERT_MIN, 0, STILL_MAX) }}>{t('sim.alertTick')}</b>
              <span style={{ left: '100%' }}>{STILL_MAX}</span>
            </span>
          </label>
          <div className="sim-opts">
            <Toggle label={t('sim.speech')} value={s.speech} disabled={locked} onChange={(speech) => set({ speech })}
              options={SPEECH.map((v) => ({ v, text: t(`sim.speechOpt.${v}`) }))} />
            <Toggle label={t('sim.david')} value={s.davidPicksUp} disabled={locked} onChange={(davidPicksUp) => set({ davidPicksUp })}
              options={[{ v: true, text: t('sim.yes') }, { v: false, text: t('sim.no') }]} />
          </div>
          <div className="btns">
            <button type="button" className="btn" title={t('sim.runTitle')} disabled={locked} onClick={api.toggleRun}>
              {t(api.running ? 'sim.pause' : 'sim.resume')}
            </button>
            <button type="button" className="btn soft" disabled={locked} onClick={api.toggleFast}>{t(api.fast ? 'sim.normal' : 'sim.faster')}</button>
            <button type="button" className="btn soft" onClick={onReset}>{t('sim.reset')}</button>
            {locked && <span className="sim-lock"><Glyph name="lock" />{t('sim.locked')}</span>}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
