'use client'

import './districtCard.css'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DistrictMap } from '@/components/canvas/DistrictMap'
import { MapZoom } from '@/components/canvas/MapZoom'
import type { Canvas3DHandle } from '@/components/canvas/useCanvas3D'
import { useToast } from '@/components/ui/Toast'
import type { Area } from '@/data/government.types'
import type { CityView } from '@/data/types'
import { SuppressionNote } from '@/components/ui/Suppressed'
import { DISTRICT_MODEL_IDS, districtModel, HIGHER_IS_BETTER, areaMetricHidden, metricFor, type DistrictModel } from '@/domain/district'

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
  // Narrow screens are width-bound: pull the camera back so the whole board stays in view.
  const narrow = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 700px)').matches
  const camera = useMemo(() => (view && narrow ? { ...view, zoom: (view.zoom ?? 1) * 0.84 } : view), [view, narrow])
  const metric = useMemo(
    () => ({ values: areas.map((a) => metricFor(a, model)), suffix: m.unit, higherIsBetter: HIGHER_IS_BETTER[model], hidden: areaMetricHidden(areas, model) }),
    [areas, model, m.unit],
  )
  const anyHidden = metric.hidden.some(Boolean)
  return (
    <article className="glass map-card district-card c8" style={{ minHeight: 540 }}>
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
      {/* Always the canvas columns (the design's board), with or without a Maps key. */}
      {camera ? (
        <DistrictMap ref={city} areas={areas} metric={metric} view={camera} ariaLabel={t('population.district.ariaLabel')} onSelect={toast} />
      ) : (
        <div className="c3d" role="img" aria-label={t('population.district.ariaLabel')}></div>
      )}
      {camera && <MapZoom map={city} />}
      {/* Hints, not controls: plain text so nothing looks pressable. */}
      <p className="map-bottom map-hint">{chips.join(' · ')}</p>
      {anyHidden && <SuppressionNote className="fine map-hint" />}
    </article>
  )
}
