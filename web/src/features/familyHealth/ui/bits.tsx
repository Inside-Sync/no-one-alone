import { Fragment, type ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/data/types'
import type { FhIcon } from '../index'
import s from './fh.module.css'

/** Class names of the panel stylesheet: `c('node', act && 'act')` (the prototype's markup, module-scoped). */
export function c(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).flatMap((n) => (n as string).split(' ')).map((n) => s[n] ?? n).join(' ')
}

/** The engine's icon names, mapped to the app's emoji table (a few clash with the app's own and use the panel's variant). */
const FH: Partial<Record<FhIcon, IconName>> = {
  search: 'fh-search', footprints: 'fh-walk', activity: 'fh-walk', stop: 'fh-stop', heart: 'fh-heart',
}
export const fhIcon = (n: FhIcon): IconName => FH[n] ?? (n as IconName)

/** A colour emoji, drawn by `Icon` (the one place emoji live is `components/ui/emoji.ts`). */
export function E({ n, className }: { n: FhIcon | IconName; className?: string }) {
  if (n === 'check') return <span className={className} aria-hidden="true">✓</span>
  return <span className={c('e', className)} aria-hidden="true"><Icon name={fhIcon(n as FhIcon)} tint /></span>
}

/** "<b>…</b>" in a locale string, rendered safely as bold runs (no HTML parsing). */
export function Bold({ text }: { text: string }): ReactNode {
  const parts = text.split(/<b>|<\/b>/)
  return <>{parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : <Fragment key={i}>{p}</Fragment>))}</>
}

export const toneOf = (st: string): string => ({ overdue: 'bad', due: 'warn', done: 'good' } as Record<string, string>)[st] ?? 'muted'

/** A locale string with `<n/>` where the prototype typed "Next ▸": the glyph is drawn by CSS. */
export function WithNext({ text }: { text: string }): ReactNode {
  const parts = text.split('<n/>')
  return <>{parts.map((p, i) => <Fragment key={i}>{i > 0 && <span className={c('gNext')} />}{p}</Fragment>)}</>
}
