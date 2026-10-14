'use client'

import { useMemo, useState } from 'react'
import { DistrictMap } from '@/components/canvas/DistrictMap'
import { Chip } from '@/components/ui/Chip'
import { useToast } from '@/components/ui/Toast'
import { COMMUNITY_COPY } from '@/data/repo'
import type { CityView, Suburb } from '@/data/types'
import { DISTRICT_MODELS, DISTRICT_MODEL_IDS, metricFor, type DistrictModel } from '@/domain/district'

interface Props {
  suburbs: Suburb[]
  kicker: string
  /** Camera preset; null while the city geometry loads. The model buttons work without it. */
  view: CityView | null
}

/** Inner West 3D column map (`.map-card.c8`) with the four metric models. */
export function DistrictCard({ suburbs, kicker, view }: Props) {
  const toast = useToast()
  const [model, setModel] = useState<DistrictModel>('high')
  const c = COMMUNITY_COPY.overview.district
  const m = DISTRICT_MODELS[model]
  const metric = useMemo(
    () => ({ values: suburbs.map((s) => metricFor(s, model)), suffix: DISTRICT_MODELS[model].unit }),
    [suburbs, model],
  )
  return (
    <article className="glass map-card c8" style={{ minHeight: 540 }}>
      <div className="map-top">
        <div className="loc"><span className="k">{kicker}</span><b>{m.title}</b><small>{m.subtitle}</small></div>
        <div className="map-ctrl">
          <div className="seg" role="group" aria-label={c.group}>
            {DISTRICT_MODEL_IDS.map((id) => (
              <button key={id} type="button" aria-pressed={id === model} onClick={() => setModel(id)}>{c.buttons[id]}</button>
            ))}
          </div>
        </div>
      </div>
      {view ? (
        <DistrictMap suburbs={suburbs} metric={metric} view={view} ariaLabel={c.ariaLabel} onSelect={toast} />
      ) : (
        <div className="c3d" role="img" aria-label={c.ariaLabel}></div>
      )}
      <div className="map-bottom">
        {c.chips.map((t) => <Chip key={t}>{t}</Chip>)}
      </div>
    </article>
  )
}
