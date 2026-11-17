'use client'

import { useMemo, type CSSProperties, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import type { Area } from '@/data/government.types'
import type { CityView } from '@/data/types'
import { City3D } from './City3D'
import { buildDistrict } from './city/geometry'
import type { Canvas3DHandle } from './useCanvas3D'

export interface DistrictMetric {
  /** One value per area, in `areas` order. */
  values: number[]
  /** Tag suffix, e.g. " open", "%", " d". */
  suffix: string
  /** A tall column is a good one (reached care, coverage): the colour runs the other way. */
  higherIsBetter?: boolean
}

interface Props {
  areas: Area[]
  metric: DistrictMetric
  view: CityView
  /** Prototype default for `#district`. */
  ariaLabel?: string
  /** Area drawn with the brand outline and colour. */
  highlight?: string
  onSelect?: (text: string) => void
  night?: boolean
  className?: string
  style?: CSSProperties
  ref?: Ref<Canvas3DHandle>
}

/**
 * Abu Dhabi 3D column map (`#district`, `buildDistrict`). Supports all four measures: the caller computes the
 * per-area values (`metricFor`), this draws the tiles, columns and tags.
 */
export function DistrictMap({
  areas,
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
    () => buildDistrict(areas, metric.values, metric.suffix, highlight, metric.higherIsBetter),
    [areas, metric.values, metric.suffix, metric.higherIsBetter, highlight],
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
