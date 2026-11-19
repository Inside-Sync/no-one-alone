'use client'

import { useTranslation } from 'react-i18next'
import type { Cell, DbRow, DbTable, StepKindName } from '../../engine'

/** Plan item G2: where a value comes from. Observed, calculated, prepared text, AI-written (live only), clinician confirmed. */
export type Prov = 'observed' | 'calculated' | 'prepared' | 'ai' | 'clinician'
export const PROVS: readonly Prov[] = ['observed', 'calculated', 'prepared', 'ai', 'clinician']

/** The tcGates translator for keys built at run time (a kind, a tag): untyped. */
export type TG = (key: string, opts?: Record<string, unknown>) => string
export const useG = (): TG => useTranslation('tcGates').t as unknown as TG

const keyOf = (c: Cell | undefined): string => (c != null && typeof c === 'object' && 'k' in c ? c.k : '')

/** Event log category (`LogEntry.m`) -> tag. People enter and choose (observed), rules and scores calculate, the AI line is the only AI text, accepting is the clinician. */
export function logProv(m: string): Prov {
  switch (m) {
    case 'START': case 'WATCH': case 'DETECT': case 'ANSWER': case 'CHOICE': case 'EDIT': case 'CONSENT': case 'BOOK': case 'ACT': return 'observed'
    case 'AI': return 'ai'
    case 'ACCEPT': return 'clinician'
    default: return 'calculated'
  }
}

/** Demo database row -> tag, from the table and the cells that say who wrote it. */
export function dbProv(table: DbTable, row: DbRow): Prov {
  switch (table) {
    case 'patients': case 'consents': case 'observations': return 'observed'
    case 'alerts': return keyOf(row.status) === 'status.accepted' ? 'clinician' : 'calculated'
    case 'tasks': return keyOf(row.task) === 'db.actClinician' ? 'clinician' : 'calculated'
    case 'encounters': return String(row.encounter_id ?? '').startsWith('SRC') ? 'observed' : 'clinician'
    case 'audit': return keyOf(row.actor) === 'actor.hospital' ? 'clinician' : 'calculated'
    default: return 'calculated'
  }
}

/** What each step card is made of (key values on the card). */
export const CARD_PROV: Record<StepKindName, Prov[]> = {
  home: ['observed', 'calculated'], passport: ['observed', 'calculated'], famhub: ['observed', 'calculated'],
  tl: ['calculated'], btn: ['clinician'], teach: ['prepared', 'calculated'], recheck: ['observed', 'calculated'], daily: ['observed', 'calculated'],
  accept: ['clinician', 'calculated'], result: ['observed', 'calculated'], famresult: ['observed', 'calculated'], refer: ['clinician', 'calculated'], report: ['calculated'],
}

/** One small tag. The word is always shown, colour only helps. */
export function ProvTag({ kind }: { kind: Prov }) {
  const t = useG()
  return <span className={`prov prov-${kind}`} title={t(`prov.${kind}.desc`)} data-prov={kind}>{t(`prov.${kind}.label`)}</span>
}

/** A rule id (R1, P6, F4...) with its tooltip: where the rule comes from. */
export function RuleId({ id }: { id: string }) {
  const t = useG()
  return <span className="tc-ruleid" title={t('gates.ruleTip')}>{id}</span>
}

/** The five tags and what they mean. */
export function ProvLegend() {
  const t = useG()
  return (
    <>
      <p className="prov-legend-t">{t('prov.legend')}</p>
      <ul className="prov-legend" aria-label={t('prov.legend')}>
        {PROVS.map((p) => <li key={p}><ProvTag kind={p} /><span>{t(`prov.${p}.desc`)}</span></li>)}
      </ul>
    </>
  )
}

/** "On this card": which parts of the step card are observed, calculated, prepared, AI-written or confirmed. */
export function ProvLine({ kind, live = false }: { kind: StepKindName; live?: boolean }) {
  const t = useG()
  const ps = live ? CARD_PROV[kind].map((p) => (p === 'prepared' ? 'ai' : p)) : CARD_PROV[kind]
  return (
    <ul className="prov-line" aria-label={t('prov.onCard')}>
      {ps.map((p) => <li key={p}><ProvTag kind={p} /><span>{t(`cardProv.${kind}.${p}`)}</span></li>)}
    </ul>
  )
}
