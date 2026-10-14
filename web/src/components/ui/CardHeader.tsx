import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { Pill, type PillTone } from './Pill'

interface Props {
  icon: IconName
  title: ReactNode
  meta?: ReactNode
  pill?: { tone: PillTone; text: ReactNode }
}

/** `.ch` header: icon bubble, h2, right-aligned meta, optional status pill. */
export function CardHeader({ icon, title, meta, pill }: Props) {
  return (
    <div className="ch">
      <span className="li"><span className="ic"><Icon name={icon} /></span></span>
      <h2>{title}</h2>
      {meta != null && <span className="meta">{meta}</span>}
      {pill && <Pill tone={pill.tone}>{pill.text}</Pill>}
    </div>
  )
}
