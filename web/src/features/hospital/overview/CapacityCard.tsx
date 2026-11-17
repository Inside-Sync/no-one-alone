import { useTranslation } from 'react-i18next'
import { CardHeader } from '@/components/ui/CardHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import type { OverviewData } from '@/data/types'
import { BAND_COLOUR, BAND_TONE, bandOf, pctOf } from './bands'
import { HpBar } from './HpBar'
import './overview.css'

/** Where the meter ends: 110% in use. */
const METER_MAX = 110

function Meter({ pct }: { pct: number }) {
  const { t } = useTranslation('overview')
  const at = (Math.max(0, Math.min(METER_MAX, pct)) / METER_MAX) * 100
  return (
    <div className="capm" role="img" aria-label={t('capacity.meter', { pct })}>
      <div className="capz">
        <span className="u" style={{ width: `${(70 / METER_MAX) * 100}%` }} />
        <span className="r" style={{ width: `${(20 / METER_MAX) * 100}%` }} />
        <span className="o" />
      </div>
      <i style={{ insetInlineStart: `${at}%` }} />
      <div className="capl"><span>{t('capacity.zones.under')}</span><span>{t('capacity.zones.right')}</span><span>{t('capacity.zones.over')}</span></div>
    </div>
  )
}

/** `Capacity and effectiveness` (c12): beds against the capacity bands, and the overall effectiveness score. */
export function CapacityCard({ data }: { data: OverviewData }) {
  const { t } = useTranslation('overview')
  const { capacity, effectiveness } = data
  const pct = pctOf(capacity.used, capacity.total)
  const band = bandOf(pct)
  const score = Math.round(effectiveness.measures.reduce((a, m) => a + m.value, 0) / effectiveness.measures.length)
  return (
    <GlassCard span={12} id="capEff">
      <CardHeader icon="target" title={t('capacity.title')} meta={t('capacity.meta')} />
      <div className="ce">
        <div>
          <span className="ck">{t('capacity.label')}</span>
          <div className="ce-h">
            <b>{pct}%</b>
            <Pill tone={BAND_TONE[band]}>{t(`capacity.bands.${band}`)}</Pill>
            <small>{t('capacity.inUse', { used: capacity.used, total: capacity.total })}</small>
          </div>
          <Meter pct={pct} />
          <ul className="ce-rows">
            {capacity.lines.map((l) => {
              const p = pctOf(l.used, l.total)
              const b = bandOf(p)
              return (
                <li key={l.label}>
                  <span>{l.label}</span>
                  <HpBar pct={p} colour={BAND_COLOUR[b]} value={`${p}%`} />
                  <Pill tone={BAND_TONE[b]}>{t(`capacity.bands.${b}`)}</Pill>
                </li>
              )
            })}
          </ul>
          <p className="ce-note">{t('capacity.note')}</p>
        </div>
        <div>
          <span className="ck">{t('effectiveness.label')}</span>
          <div className="ce-h">
            <b>{score}</b>
            <small>{t('effectiveness.context', { average: effectiveness.average, n: effectiveness.ofFacilities })}</small>
          </div>
          <ul className="ce-rows">
            {effectiveness.measures.map((m) => (
              <li key={m.label}>
                <span>{m.label}</span>
                <HpBar pct={m.value} colour="#0b7f71" value={`${m.value}%`} />
                <span />
              </li>
            ))}
          </ul>
          <p className="ce-note">{t('effectiveness.note')}</p>
        </div>
      </div>
    </GlassCard>
  )
}
