'use client'

import { useMemo, useRef } from 'react'
import { City3D, buildSuburb, watchScene } from '@/components/canvas/City3D'
import type { Canvas3DHandle } from '@/components/canvas/useCanvas3D'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { AROUND_COPY, HOME_COPY } from '@/data/repo'
import type { CityGeometry, Surroundings } from '@/data/types'

/** Neighbourhood-watch map (`.map-card.c8`): alert pins, watch ring, detour route and a legend of severities. */
export function WatchMapCard({ s, geometry }: { s: Surroundings; geometry: CityGeometry }) {
  const toast = useToast()
  const city = useRef<Canvas3DHandle>(null)
  const map = s.watchMap
  const scene = useMemo(
    () => watchScene(buildSuburb(geometry), s.pins, map.ring, s.homeMap.labels),
    [geometry, s.pins, map.ring, s.homeMap.labels],
  )
  const c = HOME_COPY.mapControls
  return (
    <article className="glass map-card c8">
      <div className="map-top">
        <div className="loc"><span className="k">{map.kicker}</span><b>{map.title}</b><small>{map.detail}</small></div>
        <div className="map-ctrl">
          <button type="button" className="rb" aria-label={c.left} onClick={() => city.current?.rotate(-Math.PI / 4)}><span className="ic"><Icon name="left" /></span></button>
          <button type="button" className="rb" aria-label={c.right} onClick={() => city.current?.rotate(Math.PI / 4)}><span className="ic"><Icon name="right" /></span></button>
        </div>
      </div>
      <City3D ref={city} scene={scene} view={geometry.views.watch} ariaLabel={map.ariaLabel} onSelect={toast} />
      <div className="map-bottom">
        {map.legend.map((l) => (
          <span key={l.label} className="chip">
            <i style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }}></i>{l.label}
          </span>
        ))}
        <Chip>{AROUND_COPY.mapChip}</Chip>
      </div>
    </article>
  )
}
