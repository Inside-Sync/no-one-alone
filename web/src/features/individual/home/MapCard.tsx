'use client'

import { useMemo, useRef } from 'react'
import { City3D, buildSuburb, homeScene } from '@/components/canvas/City3D'
import type { Canvas3DHandle } from '@/components/canvas/useCanvas3D'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { HOME_COPY } from '@/data/repo'
import type { CityGeometry, Surroundings } from '@/data/types'

interface Props {
  map: Surroundings['homeMap']
  geometry: CityGeometry
}

/** Location map (`.map-card.c8`): the 3D Marrickville model, legend, rotate buttons and distance chips. */
export function MapCard({ map, geometry }: Props) {
  const toast = useToast()
  const city = useRef<Canvas3DHandle>(null)
  const scene = useMemo(() => homeScene(buildSuburb(geometry), map), [geometry, map])
  const c = HOME_COPY.mapControls
  return (
    <article className="glass map-card c8">
      <div className="map-top">
        <div className="loc"><span className="k">{map.kicker}</span><b>{map.title}</b><small>{map.detail}</small></div>
        <div className="map-ctrl">
          <button type="button" className="rb" aria-label={c.left} onClick={() => city.current?.rotate(-Math.PI / 4)}><span className="ic"><Icon name="left" /></span></button>
          <button type="button" className="rb" aria-label={c.right} onClick={() => city.current?.rotate(Math.PI / 4)}><span className="ic"><Icon name="right" /></span></button>
          <button type="button" className="rb" aria-label={c.reset} onClick={() => city.current?.reset()}><span className="ic"><Icon name="target" /></span></button>
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
      <City3D ref={city} scene={scene} view={geometry.views.home} ariaLabel={map.ariaLabel} onSelect={toast} />
      <div className="map-bottom">
        {map.chips.map((chip) => <Chip key={chip.text} icon={chip.icon}>{chip.text}</Chip>)}
      </div>
    </article>
  )
}
