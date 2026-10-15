'use client'

import { useMemo, type CSSProperties, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import type { CityView, Suburb } from '@/data/types'
import { City3D } from './City3D'
import { buildDistrict } from './city/geometry'
import type { Canvas3DHandle } from './useCanvas3D'

export interface DistrictMetric {
  /** One value per suburb, in `suburbs` order (the DM model's `subVal`). */
  values: number[]
  /** Tag suffix, e.g. " high risk", " % alone", " heat index", " visits short". */
  suffix: string
}

interface Props {
  suburbs: Suburb[]
  metric: DistrictMetric
  view: CityView
  /** Prototype default for `#district`. */
  ariaLabel?: string
  /** Suburb drawn with the brand outline and colour. */
  highlight?: string
  onSelect?: (text: string) => void
  night?: boolean
  className?: string
  style?: CSSProperties
  ref?: Ref<Canvas3DHandle>
}

/**
 * Inner West 3D column map (`#district`, `buildDistrict`, line 1325). Supports
 * all four DM models: the caller computes the per-suburb values (Task 13's
 * `metricFor`), this draws the tiles, columns and tags.
 */
export function DistrictMap({
  suburbs,
  metric,
  view,
  ariaLabel,
  highlight,
  onSelect,
  night,
  className,
  style,
  ref,
}: Props) {
  const { t } = useTranslation()
  const scene = useMemo(
    () => buildDistrict(suburbs, metric.values, metric.suffix, highlight),
    [suburbs, metric.values, metric.suffix, highlight],
  )
  return (
    <City3D
      ref={ref}
      scene={scene}
      view={view}
      ariaLabel={ariaLabel ?? t('charts.district')}
      onSelect={onSelect}
      night={night}
      className={className}
      style={style}
    />
  )
}
