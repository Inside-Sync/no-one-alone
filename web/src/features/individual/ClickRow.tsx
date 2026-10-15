'use client'

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useDrawer } from '@/components/ui/Drawer'
import { Actions, Kv, keyActivate, type ActionList } from './home/parts'

interface Props {
  /** Drawer title: the first cell's bold text, or its text. */
  title: string
  /** `[column head, cell content]`, empty cells left out (prototype `tbody tr` click handler). */
  details: readonly (readonly [head: string, value: ReactNode])[]
  /** Drawer buttons; the individual view's by default, the hospital view passes its own (prototype line 1850). */
  actions?: ActionList
  /** Clicks on a button inside the row act on the button only (prototype line 1832); off by default, as on the screening plan. */
  buttonsStayInside?: boolean
  children: ReactNode
}

/** A `tbody tr` that opens the "Ask her about it / Share with family" drawer, like the prototype's table-row click. */
export function ClickRow({ title, details, actions, buttonsStayInside = false, children }: Props) {
  const { t } = useTranslation()
  const drawer = useDrawer()
  const list = actions ?? t('drawerActions.row', { returnObjects: true })
  const open = () =>
    drawer.open(
      title,
      <>
        <Kv rows={details.map(([k, v]) => [k, v] as const)} />
        <Actions list={list} />
      </>,
    )
  return (
    <tr className="clk" tabIndex={0} onClick={(e) => { if (!(buttonsStayInside && (e.target as Element).closest('button'))) open() }} onKeyDown={keyActivate(open)}>
      {children}
    </tr>
  )
}
