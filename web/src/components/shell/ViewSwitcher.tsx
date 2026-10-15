'use client'

import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { VIEW_BUTTONS, type ViewId } from '@/domain/views'

export function ViewSwitcher({ view, onSelect }: { view: ViewId; onSelect: (v: ViewId) => void }) {
  const { t } = useTranslation()
  return (
    <div className="views" role="group" aria-label={t('nav.chooseView')}>
      {VIEW_BUTTONS.map((b) => (
        <button key={b.id} type="button" aria-label={b.label} aria-pressed={b.id === view} onClick={() => onSelect(b.id)}>
          <span className="ic"><Icon name={b.icon} /></span>
          <span>{b.label}</span>
        </button>
      ))}
    </div>
  )
}
