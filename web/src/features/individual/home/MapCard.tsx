'use client'

import { useTranslation } from 'react-i18next'
import { useMemo, useRef, useState } from 'react'
import { City3D, buildSuburb, homeScene } from '@/components/canvas/City3D'
import type { Canvas3DHandle } from '@/components/canvas/useCanvas3D'
import { LocationMap, pinsToMarkers } from '@/components/maps/LocationMap'
import { DEFAULT_HEADING, DEFAULT_TILT, HEADING_STEP, MAP_CENTER, mapsEnabled } from '@/components/maps/mapsConfig'
import { Chip } from '@/components/ui/Chip'
import { Glyph, Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import type { CityGeometry, Surroundings } from '@/data/types'

interface Props {
  map: Surroundings['homeMap']
  geometry: CityGeometry
}

/** Location map (`.map-card.c8`): the 3D Marrickville model, legend, rotate buttons and distance chips. */
export function MapCard({ map, geometry }: Props) {
  const { t } = useTranslation('home')
  const toast = useToast()
  const city = useRef<Canvas3DHandle>(null)
  const scene = useMemo(() => homeScene(buildSuburb(geometry), map), [geometry, map])
  const markers = useMemo(() => pinsToMarkers(map.pins), [map.pins])
  const [cam, setCam] = useState({ heading: DEFAULT_HEADING, tilt: DEFAULT_TILT })
  const gmaps = mapsEnabled()
  const turn = (dir: -1 | 1) => (gmaps ? setCam((v) => ({ ...v, heading: (v.heading + dir * HEADING_STEP + 360) % 360 })) : city.current?.rotate((dir * Math.PI) / 4))
  const reset = () => (gmaps ? setCam({ heading: DEFAULT_HEADING, tilt: DEFAULT_TILT }) : city.current?.reset())
  return (
    <article className="glass map-card c8">
      <div className="map-top">
        <div className="loc"><span className="k"><Glyph name={map.icon} />{map.kicker}</span><b>{map.title}</b><small>{map.detail}</small></div>
        <div className="map-ctrl">
          <button type="button" className="rb" aria-label={t('mapControls.left')} onClick={() => turn(-1)}><span className="ic"><Icon name="left" /></span></button>
          <button type="button" className="rb" aria-label={t('mapControls.right')} onClick={() => turn(1)}><span className="ic"><Icon name="right" /></span></button>
          <button type="button" className="rb" aria-label={t('mapControls.reset')} onClick={() => reset()}><span className="ic"><Icon name="target" /></span></button>
        </div>
      </div>
      <div className="map-legend">
        {map.legend.map((l) => (
          <span key={l.label}>
            <i style={{ background: l.color, ...(l.ring ? { boxShadow: 'inset 0 0 0 1px #ccc' } : {}), ...(l.round ? { borderRadius: '50%' } : {}) }}></i>
            {l.label}
          </span>
        ))}
      </div>
      <LocationMap
        center={MAP_CENTER}
        markers={markers}
        ariaLabel={map.ariaLabel}
        heading={cam.heading}
        tilt={cam.tilt}
        fallback={<City3D ref={city} scene={scene} view={geometry.views.home} ariaLabel={map.ariaLabel} onSelect={toast} />}
      />
      <div className="map-bottom">
        {map.chips.map((chip) => <Chip key={chip.text} icon={chip.icon}>{chip.text}</Chip>)}
      </div>
    </article>
  )
}
