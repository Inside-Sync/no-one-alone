'use client'

import { Icon } from '@/components/ui/Icon'
import { VIEW_BUTTONS, type ViewId } from '@/domain/views'

export function ViewSwitcher({ view, onSelect }: { view: ViewId; onSelect: (v: ViewId) => void }) {
  return (
    <div className="views" role="group" aria-label="Choose a view">
      {VIEW_BUTTONS.map((b) => (
        <button key={b.id} type="button" aria-label={b.label} aria-pressed={b.id === view} onClick={() => onSelect(b.id)}>
          <span className="ic"><Icon name={b.icon} /></span>
          <span>{b.label}</span>
        </button>
      ))}
    </div>
  )
}
