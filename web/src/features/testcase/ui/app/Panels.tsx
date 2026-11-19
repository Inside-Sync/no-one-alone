'use client'

import { useEffect, useRef, useState } from 'react'
import { dbNoteKey } from '../../data/status'
import { Icon } from '@/components/ui/Icon'
import { DB_TABLES, tx, type Cell, type DbRow } from '../../engine'
import { dbProv, logProv, ProvLegend, ProvTag, useG } from './Provenance'
import { useA, type SessionProps } from './parts'
import './gates.css'

/** The demo database: one tab per table, newest rows first, the rows added by the current step highlighted. */
export function DbPanel({ s }: SessionProps) {
  const t = useA()
  const tg = useG()
  const { engine, snap, r } = s
  const S = snap.state
  const [copied, setCopied] = useState<'idle' | 'ok' | 'no'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const table = S.dbTab
  const rows: DbRow[] = snap.db[table].slice().reverse().slice(0, 40)
  const cols = rows.length ? Object.keys(rows[0]) : []
  const cell = (v: Cell | undefined) => (v == null ? '' : r(v))
  const copy = async () => {
    let next: 'ok' | 'no' = 'no'
    try {
      await navigator.clipboard.writeText(JSON.stringify(snap.db[table].map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, cell(v)]))), null, 2))
      next = 'ok'
    } catch { /* clipboard not allowed here */ }
    setCopied(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied('idle'), 1400)
  }
  return (
    <>
      <span id="tc-db" />
      <div className="db-h">
        <span className="li" aria-hidden="true"><span className="ic"><Icon name="file" /></span></span>
        <h2>{t('db.title')}</h2>
        <span className="pill p-demo">{t('db.demo')}</span>
        <button type="button" className="btn ghost sm" onClick={copy}>{t(copied === 'ok' ? 'db.copied' : copied === 'no' ? 'db.copyNo' : 'db.copy')}</button>
      </div>
      <div className="dbtabs" role="group" aria-label={t('db.tables')}>
        {DB_TABLES.map((k) => (
          <button key={k} type="button" aria-pressed={table === k} onClick={() => engine.setDbTab(k)}>{k}<span className="c">{snap.db[k].length}</span></button>
        ))}
      </div>
      <p className="src" id="dbnote">{r(tx(dbNoteKey(table)))}</p>
      <ProvLegend />
      <div className="tblw" tabIndex={0} role="region" aria-label={t('db.tableLabel', { table })}>
        {rows.length ? (
          <table className="tbl2">
            <thead><tr>{cols.map((c) => <th key={c} scope="col">{c}</th>)}<th scope="col">{tg('prov.col')}</th></tr></thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${i}-${String(row[cols[0]])}`} className={snap.fresh.has(String(row[cols[0]])) ? 'new' : ''}>
                  {cols.map((c) => <td key={c}>{cell(row[c])}</td>)}
                  <td><ProvTag kind={dbProv(table, row)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty" style={{ border: 0 }}>{t('db.none')}</div>}
      </div>
    </>
  )
}

/** The API and event log, newest first (every hand-off, every decision, every audit line). */
export function LogPanel({ s }: SessionProps) {
  const t = useA()
  const { snap, r } = s
  return (
    <>
      <div className="ch"><span className="li" aria-hidden="true"><span className="ic"><Icon name="bolt" /></span></span><h2>{t('log.title')}</h2></div>
      <p className="src">{t('log.note')}</p>
      <div role="log" aria-label={t('log.title')}>
        <ul className="loglist" aria-label={t('log.title')} tabIndex={0}>
          {snap.log.map((l, i) => (
            <li key={`${snap.log.length - i}`}><span>{l.t}</span><span className={`m ${l.cls}`}>{l.m}</span><span className="tx"><ProvTag kind={logProv(l.m)} /> {r(l.tx)}</span></li>
          ))}
        </ul>
      </div>
    </>
  )
}
