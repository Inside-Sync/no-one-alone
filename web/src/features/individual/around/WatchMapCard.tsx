'use client'

import { useMemo, useRef, useState } from 'react'
import { City3D, buildStreets, streetWatchScene } from '@/components/canvas/City3D'
import { MapZoom } from '@/components/canvas/MapZoom'
import type { Canvas3DHandle } from '@/components/canvas/useCanvas3D'
import { LocationMap, pinsToMarkers } from '@/components/maps/LocationMap'
import { DEFAULT_HEADING, DEFAULT_TILT, HEADING_STEP, MAP_CENTER, mapsEnabled } from '@/components/maps/mapsConfig'
import { Chip } from '@/components/ui/Chip'
import { Glyph, Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from 'react-i18next'
import type { CityGeometry, Surroundings } from '@/data/types'

/** Neighbourhood-watch map (`.map-card.c8`) on Margaret's real streets: alert pins, watch ring and a legend of severities. */
export function WatchMapCard({ s, geometry }: { s: Surroundings; geometry: CityGeometry }) {
  const toast = useToast()
  const city = useRef<Canvas3DHandle>(null)
  const map = s.watchMap
  // The OpenStreetMap layer is static, so it is built once per mount.
  const streets = useMemo(() => buildStreets(), [])
  const scene = useMemo(
    () => streetWatchScene(streets, s.pins, map.ring, s.homeMap.labels),
    [streets, s.pins, map.ring, s.homeMap.labels],
  )
  const markers = useMemo(() => pinsToMarkers(s.pins), [s.pins])
  const [heading, setHeading] = useState(DEFAULT_HEADING)
  const gmaps = mapsEnabled()
  const turn = (dir: -1 | 1) => (gmaps ? setHeading((h) => (h + dir * HEADING_STEP + 360) % 360) : city.current?.rotate((dir * Math.PI) / 4))
  const reset = () => (gmaps ? setHeading(DEFAULT_HEADING) : city.current?.reset())
  const { t } = useTranslation(['around', 'home'])
  return (
    <article className="glass map-card c8">
      <div className="map-top">
        <div className="loc"><span className="k"><Glyph name={map.icon} />{map.kicker}</span><b>{map.title}</b><small>{map.detail}</small></div>
        <div className="map-ctrl">
          <button type="button" className="rb" aria-label={t('home:mapControls.left')} onClick={() => turn(-1)}><span className="ic"><Icon name="left" /></span></button>
          <button type="button" className="rb" aria-label={t('home:mapControls.right')} onClick={() => turn(1)}><span className="ic"><Icon name="right" /></span></button>
          <button type="button" className="rb" aria-label={t('home:mapControls.reset')} onClick={() => reset()}><span className="ic"><Icon name="target" /></span></button>
        </div>
      </div>
      <LocationMap
        center={MAP_CENTER}
        markers={markers}
        ariaLabel={map.ariaLabel}
        heading={heading}
        tilt={DEFAULT_TILT}
        fallback={<City3D ref={city} scene={scene} view={geometry.views.street} ariaLabel={map.ariaLabel} onSelect={toast} />}
      />
      {!gmaps && <small className="map-attr">© OpenStreetMap contributors</small>}
      {!gmaps && <MapZoom map={city} />}
      <div className="map-bottom">
        {map.legend.map((l) => (
          <span key={l.label} className="chip">
            <i style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }}></i>{l.label}
          </span>
        ))}
        <Chip>{t('mapChip')}</Chip>
      </div>
    </article>
  )
}
