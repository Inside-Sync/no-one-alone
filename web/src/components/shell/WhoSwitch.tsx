'use client'

import { useTranslation } from 'react-i18next'
import { Glyph } from '@/components/ui/Icon'
import type { Who } from '@/domain/views'
import s from './shell.module.css'

export function WhoSwitch({ who, onSelect }: { who: Who; onSelect: (w: Who) => void }) {
  const { t } = useTranslation()
  return (
    <div className={`seg ${s.whoseg}`} id="whoSeg" role="group" aria-label={t('nav.whose')}>
      <button type="button" aria-pressed={who === 'self'} onClick={() => onSelect('self')}><Glyph name="user-round" />{t('nav.whoSelf')}</button>
      <button type="button" aria-pressed={who === 'family'} onClick={() => onSelect('family')}><Glyph name="users" />{t('nav.whoFamily')}</button>
    </div>
  )
}
