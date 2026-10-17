'use client'

import { useTranslation } from 'react-i18next'
import { useDrawer } from '@/components/ui/Drawer'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import type { DeviceFeed, DeviceRow } from '@/data/types'
import { Actions, Kv, keyActivate } from '../home/parts'
import { TableScroll } from '@/components/ui/TableScroll'

function RowDrawerBody({ row }: { row: DeviceRow }) {
  const { t } = useTranslation(['health', 'common'])
  const cols = t('devices.columns', { returnObjects: true })
  return (
    <>
      <Kv
        rows={[
          [cols[1], row.metrics],
          [cols[2], row.frequency],
          [cols[3], <Pill key="s" tone={row.tone}>{row.status}</Pill>],
          [cols[4], row.sharedWith],
        ]}
      />
      <Actions list={t('common:drawerActions.row', { returnObjects: true })} />
    </>
  )
}

/** `Where this comes from` (c12): one row per data source. Not tagged with a consent category. */
export function DevicesCard({ feed }: { feed: DeviceFeed }) {
  const { t } = useTranslation('health')
  const drawer = useDrawer()
  const cols = t('devices.columns', { returnObjects: true })
  return (
    <GlassCard span={12}>
      <div className="ch">
        <h2><Glyph name="smartphone" />{t('devices.title')}</h2>
        <span className="meta">{feed.meta}</span>
      </div>
      <TableScroll>
        <table>
          <thead><tr>{cols.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {feed.sources.map((r) => {
              const open = () => drawer.open(r.device, <RowDrawerBody row={r} />)
              return (
                <tr key={r.device} className="clk" tabIndex={0} onClick={open} onKeyDown={keyActivate(open)}>
                  <td><b style={{ fontWeight: 500 }}>{r.device}</b></td>
                  <td style={{ fontSize: '12.5px' }}>{r.metrics}</td>
                  <td>{r.frequency}</td>
                  <td><Pill tone={r.tone}>{r.status}</Pill></td>
                  <td style={{ fontSize: '12.5px' }}>{r.sharedWith}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
    </GlassCard>
  )
}
