'use client'

import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { AROUND_COPY, DRAWER_ACTIONS } from '@/data/repo'
import type { AirDay } from '@/data/types'
import { Actions, Head, Kv, keyActivate } from '../home/parts'
import { TableScroll } from '@/components/ui/TableScroll'

function AirDrawerBody({ d }: { d: AirDay }) {
  const cols = AROUND_COPY.air.columns
  return (
    <>
      <Kv
        rows={[
          [cols[1], <Pill key="q" tone={d.tone}>{d.quality}</Pill>],
          [cols[2], d.pm25],
          [cols[3], d.pollen],
          [cols[4], d.smoke],
          [cols[5], d.advice],
        ]}
      />
      <Actions list={DRAWER_ACTIONS.row} />
    </>
  )
}

/** `🍃 Air, pollen and smoke` (c6): 7-day table. */
export function AirCard({ air, note }: { air: AirDay[]; note: string }) {
  const drawer = useDrawer()
  const c = AROUND_COPY.air
  return (
    <GlassCard span={6}>
      <Head title={c.title} meta={c.meta} />
      <TableScroll>
        <table style={{ minWidth: 0 }}>
          <thead><tr>{c.columns.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {air.map((d) => {
              const open = () => drawer.open(d.day, <AirDrawerBody d={d} />)
              return (
                <tr key={d.day} className="clk" tabIndex={0} onClick={open} onKeyDown={keyActivate(open)}>
                  <td>{d.day}</td>
                  <td><Pill tone={d.tone}>{d.quality}</Pill></td>
                  <td className="n">{d.pm25}</td>
                  <td>{d.pollen}</td>
                  <td>{d.smoke}</td>
                  <td style={{ fontSize: 12 }}>{d.advice}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
      <p className="fine">{note}</p>
    </GlassCard>
  )
}
