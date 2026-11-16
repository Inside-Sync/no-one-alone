'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DistrictMap } from '@/components/canvas/DistrictMap'
import { MapZoom } from '@/components/canvas/MapZoom'
import type { Canvas3DHandle } from '@/components/canvas/useCanvas3D'
import { DistrictMap3D } from '@/components/maps/DistrictMap3D'
import { mapsEnabled } from '@/components/maps/mapsConfig'
import { useToast } from '@/components/ui/Toast'
import type { Area } from '@/data/government.types'
import type { CityView } from '@/data/types'
import { DISTRICT_MODEL_IDS, districtModel, HIGHER_IS_BETTER, metricFor, type DistrictModel } from '@/domain/district'

interface Props {
  areas: Area[]
  kicker: string
  /** Camera preset; null while the city geometry loads. The measure buttons work without it. */
  view: CityView | null
}

/** Abu Dhabi 3D column map (`.map-card.c8`) with the four measures. */
export function DistrictCard({ areas, kicker, view }: Props) {
  const toast = useToast()
  const [model, setModel] = useState<DistrictModel>('open')
  const city = useRef<Canvas3DHandle>(null)
  const { t } = useTranslation('government')
  const chips = t('population.district.chips', { returnObjects: true })
  const buttons = t('population.district.buttons', { returnObjects: true })
  const m = districtModel(model)
  const metric = useMemo(
    () => ({ values: areas.map((a) => metricFor(a, model)), suffix: m.unit, higherIsBetter: HIGHER_IS_BETTER[model] }),
    [areas, model, m.unit],
  )
  return (
    <article className="glass map-card c8" style={{ minHeight: 540 }}>
      <div className="map-top">
        <div className="loc"><span className="k">{kicker}</span><b>{m.title}</b><small>{m.subtitle}</small></div>
        <div className="map-ctrl">
          <div className="seg" role="group" aria-label={t('population.district.group')}>
            {DISTRICT_MODEL_IDS.map((id) => (
              <button key={id} type="button" aria-pressed={id === model} onClick={() => setModel(id)}>{buttons[id]}</button>
            ))}
          </div>
        </div>
      </div>
      {mapsEnabled() ? (
        <DistrictMap3D areas={areas} metric={metric} ariaLabel={t('population.district.ariaLabel')} onSelect={toast} />
      ) : view ? (
        <DistrictMap ref={city} areas={areas} metric={metric} view={view} ariaLabel={t('population.district.ariaLabel')} onSelect={toast} />
      ) : (
        <div className="c3d" role="img" aria-label={t('population.district.ariaLabel')}></div>
      )}
      {!mapsEnabled() && view && <MapZoom map={city} />}
      {/* Hints, not controls: plain text so nothing looks pressable. */}
      <p className="map-bottom map-hint">{chips.join(' · ')}</p>
    </article>
  )
}
