'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { OnceButton } from '@/components/ui/OnceButton'
import { useDrawer } from '@/components/ui/Drawer'
import { Pill } from '@/components/ui/Pill'
import { HOME_COPY, ONCE_LABELS } from '@/data/repo'
import type { HelperLogEntry } from '@/data/types'
import { Actions, Kv, keyActivate } from './parts'
import { TableScroll } from '@/components/ui/TableScroll'

const HOW_TONE = (e: HelperLogEntry) => (e.needsApproval ? 'warn' : e.how === 'Noticed' || e.how === 'Passive' ? 'plain' : 'brand')

/** Row detail drawer (prototype `tbody tr` click handler, individual view). */
function RowDrawerBody({ entry }: { entry: HelperLogEntry }) {
  const cols = HOME_COPY.helper.columns
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
      <Actions list={[['🗣️ Ask her about it', 'Added to her next chat', 'Added'], ['📤 Share with family', 'Shared', 'Shared']]} />
    </>
  )
}

/** `🤖 What the helper did today` (c12): the audit table; rows needing approval carry an Approve button. */
export function HelperCard({ log }: { log: HelperLogEntry[] }) {
  const drawer = useDrawer()
  const c = HOME_COPY.helper
  return (
    <GlassCard span={12}>
      <div className="ch">
        <h2>{c.title}</h2>
        <span className="meta">{c.meta}</span>
      </div>
      <TableScroll>
        <table>
          <thead><tr>{c.columns.map((h) => <th key={h}>{h}</th>)}</tr></thead>
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
                      <>{' '}<OnceButton className="sm" toast={c.approve.toast} done={ONCE_LABELS.Approve}>{c.approve.label}</OnceButton></>
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
