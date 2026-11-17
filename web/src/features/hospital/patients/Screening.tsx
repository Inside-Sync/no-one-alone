'use client'

import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { TableScroll } from '@/components/ui/TableScroll'
import type { PatientScreening } from '@/data/patients.types'
import { EntryLink, Head, Src } from './parts'
import { useRecord, useRowOpen } from './context'

function Row({ r }: { r: PatientScreening }) {
  const row = useRowOpen(r.entry)
  return (
    <tr {...row}>
      <td className="n">{r.when}</td>
      <td><EntryLink entry={r.entry}>{r.what}</EntryLink></td>
      <td><b style={{ fontWeight: 500 }}>{r.result}</b></td>
      <td>{r.happened}</td>
    </tr>
  )
}

function LoopItem({ l }: { l: { tone: 'good' | 'bad'; title: string; detail: string; entry?: string } }) {
  const row = useRowOpen(l.entry)
  return (
    <li {...row}>
      <span className="li" style={{ color: `var(--${l.tone})` }} aria-hidden="true"><span className="ic"><Icon name={l.tone === 'good' ? 'check' : 'x'} /></span></span>
      <span><b><EntryLink entry={l.entry}>{l.title}</EntryLink></b><small>{l.detail}</small></span>
    </li>
  )
}

/** `Was the loop closed?`: five checks, the last two failed. */
function Loop() {
  const { t } = useTranslation('patients')
  const { data: { moza: m } } = useRecord()
  return (
    <GlassCard span={5} tour="chart-loop">
      <Head title={t('scr.loopTitle')}><span className="pill bad">{t('scr.loopPill')}</span></Head>
      <ul className="list">
        {m.loop.map((l) => <LoopItem key={l.title} l={l} />)}
      </ul>
      <p className="fine">{t('scr.loopFine')}</p>
      <Src k="loop" />
    </GlassCard>
  )
}

/** Step 3: what screening found and what happened next; for Moza also whether the loop was closed. */
export function ScreeningStep() {
  const { t } = useTranslation('patients')
  const { patient: p, data, gender } = useRecord()
  const moza = p.id === 'moza'
  const rows = moza ? data.moza.screening : p.screening
  return (
    <>
      <GlassCard span={moza ? 7 : 12}>
        <Head title={moza ? t('scr.mozaTitle') : t('scr.title', { context: gender })} meta={moza ? t('scr.mozaMeta') : t('scr.meta')} />
        <TableScroll>
          <table>
            <thead><tr><th>{t('scr.head.when')}</th><th>{t('scr.head.what')}</th><th>{t('scr.head.result')}</th><th>{t('scr.head.happened')}</th></tr></thead>
            <tbody>{rows.map((r) => <Row key={r.when + r.what} r={r} />)}</tbody>
          </table>
        </TableScroll>
        <Src k={moza ? 'scrMoza' : 'scr'} />
      </GlassCard>
      {moza && <Loop />}
    </>
  )
}
