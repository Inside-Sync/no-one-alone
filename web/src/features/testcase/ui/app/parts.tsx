'use client'

import { useTranslation } from 'react-i18next'
import { tx, type Txt } from '../../engine'
import type { TestCaseSession } from './useTestCaseEngine'

/** The tcApp translator (the app's own chrome: header, picker, stepper, judges). */
export const useA = () => useTranslation('tcApp').t
/** The same translator for keys built at run time (a case id, a KPI id): untyped. */
export type TA = (key: string, opts?: Record<string, unknown>) => string
export const useAd = (): TA => useTranslation('tcApp').t as unknown as TA

export interface SessionProps { s: TestCaseSession }

/** One token of the engine's context (the person's name, the hospital...) as text. */
export function tokText(s: TestCaseSession, name: string): string {
  const v = s.ctx[name]
  if (v == null || typeof v === 'boolean') return ''
  if (typeof v === 'object' && 'list' in v) return v.list.map((x) => s.r(x)).join(v.sep)
  return s.r(v as Txt | string | number)
}

/** `{ meta, bold }` pairs as in the prototype's `kv` (a list of facts). */
export function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <div className="explain">
      {rows.map(([k, v], i) => <div key={i} className="fnd"><div className="meta">{k}</div><div><b>{v}</b></div></div>)}
    </div>
  )
}

export const key = (k: string): Txt => tx(k)
