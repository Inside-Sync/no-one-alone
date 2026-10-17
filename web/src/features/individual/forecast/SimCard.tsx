import { GlassCard } from '@/components/ui/GlassCard'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { useTranslation } from 'react-i18next'
import { intlLocale } from '@/i18n'
import type { Forecast } from '@/data/types'
import { deltaLabel, simulateRisk, type SimInput } from '@/domain/riskSim'
import { Head } from '../home/parts'

const toneColour = { good: 'var(--good-text)', bad: 'var(--bad-text)', muted: 'var(--muted-text)' } as const

/** `🎛️ Try it: what if…` (c5): three sliders, the hearing-aid switch and the four result cells. */
export function SimCard({ sim, value, onChange }: { sim: Forecast['sim']; value: SimInput; onChange: (next: SimInput) => void }) {
  const { t, i18n } = useTranslation('forecast')
  const cells = t('sim.cells', { returnObjects: true }) as { key: 'stroke' | 'fall' | 'admission' | 'mci'; label: string }[]
  const numLocale = intlLocale(i18n.resolvedLanguage)
  const [adh, steps, salt] = sim.sliders
  const r = simulateRisk(value)
  const sliderProps = (s: typeof adh, key: 'adherence' | 'steps' | 'salt', text: string) => ({
    min: s.min, max: s.max, step: s.step, label: s.label, valueText: text,
    value: value[key],
    onChange: (n: number) => onChange({ ...value, [key]: n } as SimInput),
  })
  return (
    <GlassCard span={5}>
      <Head title={t('sim.title')} meta={t('sim.meta')} />
      <div className="sim">
        <Slider {...sliderProps(adh, 'adherence', t('sim.adherenceValue', { n: value.adherence }))} />
        <Slider {...sliderProps(steps, 'steps', value.steps.toLocaleString(numLocale))} />
        <Slider {...sliderProps(salt, 'salt', sim.saltLabels[value.salt])} />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12.5px' }}>{sim.hearingLabel}</span>
          <Switch id="sHear" checked={value.hearingAids} label={t('sim.hearingSwitchLabel')} onChange={(on) => onChange({ ...value, hearingAids: on })} />
        </div>
      </div>
      <div className="sim-out" id="simOut">
        {cells.map(({ key, label }) => {
          const d = deltaLabel(r[key], sim.base[key])
          return (
            <div key={key}>
              <small>{label}</small>
              <b style={{ color: toneColour[d.tone] }}>{d.text}</b>
            </div>
          )
        })}
      </div>
      <p className="fine">{sim.note}</p>
    </GlassCard>
  )
}
