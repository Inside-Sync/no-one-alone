'use client'

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SourceFoot } from '@/features/shared/careRecord'
import { useRecord, useRowOpen } from './context'


/** `.ch` header of a card. */
export function Head({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="ch">
      <h2>{title}</h2>
      {meta != null && <span className="meta">{meta}</span>}
      {children}
    </div>
  )
}

/** The source line under a card: the label comes from `patients:src.<key>`, the time from there too unless given. */
export type SrcKey = 'glance' | 'journey' | 'summary' | 'shared' | 'adm' | 'eps' | 'access' | 'family' | 'noa' | 'scrMoza' | 'loop' | 'scr' | 'resMoza' | 'res' | 'course' | 'tx' | 'flags' | 'tasks' | 'timeline'

export function Src({ k, time }: { k: SrcKey | 'vitals'; time?: string }) {
  const { t } = useTranslation('patients')
  const label = t(`src.${k}.label`)
  return <SourceFoot source={label} time={time ?? (k === 'vitals' ? '' : t(`src.${k}.time`))} />
}

/** A title that opens a chart entry, when the item has one. Without an entry the text stays plain. */
export function EntryLink({ entry, children }: { entry?: string; children: ReactNode }) {
  const { openEntry } = useRecord()
  if (!entry) return <>{children}</>
  return (
    <button type="button" className="pt-link" onClick={(e) => { e.stopPropagation(); openEntry(entry) }}>{children}</button>
  )
}

/** One `<li>` of a toned list whose item may open an entry. */
export function ToneItem({ tone, title, detail, entry }: { tone: string; title: string; detail?: string; entry?: string }) {
  const row = useRowOpen(entry)
  return (
    <li className={`t-${tone}${row.className ? ` ${row.className}` : ''}`} onClick={row.onClick}>
      <b><EntryLink entry={entry}>{title}</EntryLink></b>
      {detail ? <small>{detail}</small> : null}
    </li>
  )
}

export function ToneList({ items }: { items: readonly { tone: string; title: string; detail?: string; entry?: string }[] }) {
  return <ul className="pt-l">{items.map((i) => <ToneItem key={i.title} {...i} />)}</ul>
}
