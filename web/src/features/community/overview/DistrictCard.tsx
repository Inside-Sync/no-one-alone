'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DistrictMap } from '@/components/canvas/DistrictMap'
import { Chip } from '@/components/ui/Chip'
import { useToast } from '@/components/ui/Toast'
import type { CityView, Suburb } from '@/data/types'
import { DISTRICT_MODEL_IDS, districtModel, metricFor, type DistrictModel } from '@/domain/district'

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
  const { t } = useTranslation('community')
  const chips = t('overview.district.chips', { returnObjects: true })
  const buttons = t('overview.district.buttons', { returnObjects: true })
  const m = districtModel(model)
  const metric = useMemo(
    () => ({ values: suburbs.map((s) => metricFor(s, model)), suffix: m.unit }),
    [suburbs, model, m.unit],
  )
  return (
    <article className="glass map-card c8" style={{ minHeight: 540 }}>
      <div className="map-top">
        <div className="loc"><span className="k">{kicker}</span><b>{m.title}</b><small>{m.subtitle}</small></div>
        <div className="map-ctrl">
          <div className="seg" role="group" aria-label={t('overview.district.group')}>
            {DISTRICT_MODEL_IDS.map((id) => (
              <button key={id} type="button" aria-pressed={id === model} onClick={() => setModel(id)}>{buttons[id]}</button>
            ))}
          </div>
        </div>
      </div>
      {view ? (
        <DistrictMap suburbs={suburbs} metric={metric} view={view} ariaLabel={t('overview.district.ariaLabel')} onSelect={toast} />
      ) : (
        <div className="c3d" role="img" aria-label={t('overview.district.ariaLabel')}></div>
      )}
      <div className="map-bottom">
        {chips.map((chip) => <Chip key={chip}>{chip}</Chip>)}
      </div>
    </article>
  )
}
