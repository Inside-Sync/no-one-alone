'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { OnceButton } from '@/components/ui/OnceButton'
import { useDrawer } from '@/components/ui/Drawer'
import { Pill } from '@/components/ui/Pill'
import type { HelperLogEntry } from '@/data/types'
import { Actions, Kv, keyActivate } from './parts'
import { TableScroll } from '@/components/ui/TableScroll'

/** "How" values that mean the helper only watched. The column text is translated data, so both languages are listed. */
const PASSIVE_HOW: ReadonlySet<string> = new Set(['Noticed', 'Passive', 'Đã nhận thấy', 'Thụ động'])
const HOW_TONE = (e: HelperLogEntry) => (e.needsApproval ? 'warn' : PASSIVE_HOW.has(e.how) ? 'plain' : 'brand')

/** Row detail drawer (prototype `tbody tr` click handler, individual view). */
function RowDrawerBody({ entry }: { entry: HelperLogEntry }) {
  const { t } = useTranslation(['home', 'common'])
  const cols = t('helper.columns', { returnObjects: true })
  return (
    <>
      <Kv
        rows={[
          [cols[0], entry.time],
          [cols[1], entry.what],
          [cols[2], <Pill key="how" tone={HOW_TONE(entry)}>{entry.how}</Pill>],
          [cols[3], entry.why],
          [cols[4], entry.result],
        ]}
      />
      <Actions list={t('common:drawerActions.row', { returnObjects: true })} />
    </>
  )
}

/** `What the helper did today` (c12): the audit table; rows needing approval carry an Approve button. */
export function HelperCard({ log }: { log: HelperLogEntry[] }) {
  const { t } = useTranslation(['home', 'common'])
  const drawer = useDrawer()
  return (
    <GlassCard span={12}>
      <div className="ch">
        <h2><Glyph name="bot" />{t('helper.title')}</h2>
        <span className="meta">{t('helper.meta')}</span>
      </div>
      <TableScroll>
        <table>
          <thead><tr>{t('helper.columns', { returnObjects: true }).map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {log.map((e) => {
              const open = () => drawer.open(e.time, <RowDrawerBody entry={e} />)
              return (
                <tr
                  key={e.time + e.what}
                  className="clk"
                  tabIndex={0}
                  onClick={(ev) => { if (!(ev.target as HTMLElement).closest('button')) open() }}
                  onKeyDown={keyActivate(open)}
                >
                  <td className="n">{e.time}</td>
                  <td>{e.what}</td>
                  <td><Pill tone={HOW_TONE(e)}>{e.how}</Pill></td>
                  <td>{e.why}</td>
                  <td>
                    {e.result}
                    {e.needsApproval && (
                      <>{' '}<OnceButton className="sm" toast={t('helper.approve.toast')} done={t('common:onceLabels.Approve')}>{t('helper.approve.label')}</OnceButton></>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
