import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export function Chip({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <span className="chip">
      {icon && <span className="ic"><Icon name={icon} /></span>}
      {children}
    </span>
  )
}
