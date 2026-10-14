'use client'

import type { Who } from '@/domain/views'
import s from './shell.module.css'

export function WhoSwitch({ who, onSelect }: { who: Who; onSelect: (w: Who) => void }) {
  return (
    <div className={`seg ${s.whoseg}`} id="whoSeg" role="group" aria-label="Whose view">
      <button type="button" aria-pressed={who === 'self'} onClick={() => onSelect('self')}>👵 Margaret (her own app)</button>
      <button type="button" aria-pressed={who === 'family'} onClick={() => onSelect('family')}>👨‍👩‍👧 Family &amp; carers</button>
    </div>
  )
}
