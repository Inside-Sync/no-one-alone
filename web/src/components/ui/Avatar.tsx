import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react'
import { avatarSrc } from '@/data/avatars'

interface Props extends Omit<ComponentPropsWithoutRef<'button'>, 'style' | 'name'> {
  /** The person's name: a known one shows their photo. */
  name?: string | null
  as?: 'span' | 'button'
  style?: CSSProperties
  /** Initials, shown when there is no photo. */
  children?: ReactNode
}

/** The round `.av`: the person's photo when we have one, else the initials. */
export function Avatar({ name, as: Tag = 'span', className = 'av', children, ...rest }: Props) {
  const src = avatarSrc(name)
  return <Tag className={className} {...(rest as object)}>{src ? <img src={src} alt="" /> : children}</Tag>
}
