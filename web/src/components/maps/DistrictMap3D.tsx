import { useMemo } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { Map3D, MapMode, Marker3D, Polygon3D } from '@vis.gl/react-google-maps/3d'
import { DISTRICT_RAMP, districtScale } from '@/components/canvas/city/geometry'
import type { DistrictMetric } from '@/components/canvas/DistrictMap'
import type { Area } from '@/data/government.types'
import { areaGeoRing } from '@/domain/areaGeometry'
import { ramp, rgbHex } from '@/lib/color'
import { mapsApiKey, mapsMapId } from './mapsConfig'

/** Extrusion in metres: the smallest value still stands, the largest towers over the rooftops. */
const MIN_H = 120, MAX_H = 1400

interface Column {
  name: string
  ring: [number, number][]
  centre: { lat: number; lng: number }
  height: number
  colour: string
  text: string
  value: number
}

function columns(areas: Area[], metric: DistrictMetric): Column[] {
  const scale = districtScale(metric.values)
  return areas.flatMap((s, i) => {
    const ring = areaGeoRing(s)
    const v = metric.values[i], t = Math.max(0, Math.min(1, scale[i]))
    const centre = { lng: ring.reduce((a, p) => a + p[0], 0) / ring.length, lat: ring.reduce((a, p) => a + p[1], 0) / ring.length }
    return [{ name: s.name, ring, centre, height: MIN_H + t * (MAX_H - MIN_H), colour: rgbHex(ramp(metric.higherIsBetter ? 1 - t : t, DISTRICT_RAMP)), text: `${s.name} · ${v}${metric.suffix}`, value: v }]
  })
}

interface Props {
  areas: Area[]
  metric: DistrictMetric
  ariaLabel: string
  highlight?: string
  onSelect?: (text: string) => void
}

/** Google photorealistic 3D map of Abu Dhabi with one extruded area per value. Needs a Maps key (see `mapsEnabled`). */
export function DistrictMap3D({ areas, metric, ariaLabel, highlight, onSelect }: Props) {
  const cols = useMemo(() => columns(areas, metric), [areas, metric])
  const lat = cols.reduce((a, c) => a + c.centre.lat, 0) / (cols.length || 1)
  const lng = cols.reduce((a, c) => a + c.centre.lng, 0) / (cols.length || 1)
  return (
    <div className="c3d" role="region" aria-label={ariaLabel}>
      <APIProvider apiKey={mapsApiKey()}>
        <Map3D
          mode={MapMode.SATELLITE}
          mapId={mapsMapId() || undefined}
          defaultCenter={{ lat: lat - 0.03, lng, altitude: 0 }}
          defaultRange={24000}
          defaultTilt={58}
          defaultHeading={15}
          defaultLabelsDisabled
          defaultUIHidden
          style={{ width: '100%', height: '100%' }}
        >
          {/* Each area's footprint, extruded to its value and tinted by it; a tap reports `name · value`. */}
          {cols.map((c) => (
            <Polygon3D key={c.name} outerCoordinates={c.ring.map(([lng, lat]) => ({ lat, lng, altitude: c.height }))}
              altitudeMode="RELATIVE_TO_GROUND" extruded fillColor={c.colour + 'd9'}
              strokeColor={c.name === highlight ? '#14a08c' : '#ffffffcc'} strokeWidth={c.name === highlight ? 4 : 1.5}
              onClick={() => onSelect?.(c.text)} />
          ))}
          {cols.map((c) => (
            <Marker3D key={c.name} position={{ ...c.centre, altitude: c.height + 60 }} altitudeMode="RELATIVE_TO_GROUND" label={`${c.name} ${c.value}`} />
          ))}
        </Map3D>
      </APIProvider>
    </div>
  )
}
