import type { ReactNode } from 'react'
import { AdvancedMarker, APIProvider, Map, Pin } from '@vis.gl/react-google-maps'
import type { MapPin } from '@/data/types'
import { DEFAULT_HEADING, DEFAULT_TILT, MAP_CENTER, MARKER_COLOURS, mapsApiKey, mapsEnabled, mapsMapId } from './mapsConfig'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  kind: 'home' | 'family' | 'health' | 'community' | 'alert'
  label: string
  tone?: 'act' | 'watch' | 'info'
}

/** Pins that carry a real position and category become Google markers (the rest stay canvas-only). */
export function pinsToMarkers(pins: MapPin[]): MapMarker[] {
  return pins.flatMap((p, i) =>
    p.geo && p.kind ? [{ id: `${i}-${p.name}`, lat: p.geo.lat, lng: p.geo.lng, kind: p.kind, label: p.name, tone: p.tone }] : [],
  )
}

export function markerColours(m: Pick<MapMarker, 'kind' | 'tone'>) {
  return m.kind === 'alert' ? MARKER_COLOURS[m.tone ?? 'watch'] : MARKER_COLOURS[m.kind]
}

interface Props {
  center?: { lat: number; lng: number }
  markers: MapMarker[]
  /** Rendered (canvas City3D) when no API key is configured; the Maps script is never loaded then. */
  fallback: ReactNode
  ariaLabel: string
  heading?: number
  tilt?: number
}

/** Google map with one marker per item, or the `fallback` canvas when there is no key. Overlays live in the parent card. */
export function LocationMap({ center = MAP_CENTER, markers, fallback, ariaLabel, heading = DEFAULT_HEADING, tilt = DEFAULT_TILT }: Props) {
  if (!mapsEnabled()) return <>{fallback}</>
  const mapId = mapsMapId() || 'DEMO_MAP_ID'
  return (
    <div className="c3d" role="region" aria-label={ariaLabel}>
      <APIProvider apiKey={mapsApiKey()}>
        <Map
          mapId={mapId}
          defaultCenter={center}
          defaultZoom={16}
          heading={heading}
          tilt={tilt}
          gestureHandling="greedy"
          disableDefaultUI
          style={{ width: '100%', height: '100%' }}
        >
          {markers.map((m) => {
            const c = markerColours(m)
            return (
              <AdvancedMarker key={m.id} position={{ lat: m.lat, lng: m.lng }} title={m.label}>
                <Pin background={c.bg} borderColor={c.border} glyphColor={c.glyph} />
              </AdvancedMarker>
            )
          })}
        </Map>
      </APIProvider>
    </div>
  )
}
