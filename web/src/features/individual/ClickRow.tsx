'use client'

import type { ReactNode } from 'react'
import { useDrawer } from '@/components/ui/Drawer'
import { DRAWER_ACTIONS } from '@/data/repo'
import { Actions, Kv, keyActivate } from './home/parts'

interface Props {
  /** Drawer title: the first cell's bold text, or its text. */
  title: string
  /** `[column head, cell content]`, empty cells left out (prototype `tbody tr` click handler). */
  details: readonly (readonly [head: string, value: ReactNode])[]
  children: ReactNode
}

/** A `tbody tr` that opens the "Ask her about it / Share with family" drawer, like the prototype's table-row click. */
export function ClickRow({ title, details, children }: Props) {
  const drawer = useDrawer()
  const open = () =>
    drawer.open(
      title,
      <>
        <Kv rows={details.map(([k, v]) => [k, v] as const)} />
        <Actions list={DRAWER_ACTIONS.row} />
      </>,
    )
  return (
    <tr className="clk" tabIndex={0} onClick={open} onKeyDown={keyActivate(open)}>
      {children}
    </tr>
  )
}
