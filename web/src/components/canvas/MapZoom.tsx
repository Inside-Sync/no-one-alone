import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import type { Canvas3DHandle } from './useCanvas3D'

/** The +/− zoom buttons of a cover-view City3D, above its compass. */
export function MapZoom({ map }: { map: RefObject<Canvas3DHandle | null> }) {
  const { t } = useTranslation()
  return (
    <div className="map-zoom" role="group">
      <button type="button" className="rb" aria-label={t('charts.zoomIn')} onClick={() => map.current?.zoomBy(1.5)}><span className="ic"><Icon name="plus" /></span></button>
      <button type="button" className="rb" aria-label={t('charts.zoomOut')} onClick={() => map.current?.zoomBy(1 / 1.5)}><span className="ic"><Icon name="minus" /></span></button>
    </div>
  )
}
