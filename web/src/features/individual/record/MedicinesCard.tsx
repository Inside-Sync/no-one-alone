import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { useTranslation } from 'react-i18next'
import type { CareRecord } from '@/data/types'
import { ClickRow } from '../ClickRow'
import { Head } from '../home/parts'
import { TableScroll } from '@/components/ui/TableScroll'
import { toneVar } from '@/lib/tone'

const name = { fontWeight: 500 } as const

/** `Medicines` (c4): 30-day adherence per medicine, interaction pill and the allergy note. */
export function MedicinesCard({ record }: { record: CareRecord }) {
  const { t } = useTranslation('record')
  const head = t('medicines.head', { returnObjects: true })
  const a = record.allergyNote
  return (
    <GlassCard span={4}>
      <Head title={t('medicines.title')}><Pill tone={record.medicinesPill.tone}>{record.medicinesPill.text}</Pill></Head>
      <TableScroll>
        <table style={{ minWidth: 0 }}>
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="meds">
            {record.medicines.map((m) => {
              const cell = <><b style={name}>{m.name}</b><small>{m.timing}</small></>
              return (
                <ClickRow
                  key={m.name}
                  title={m.name}
                  details={[[head[0], cell], [head[1], `${m.adherence}%`], [head[2], m.last]]}
                >
                  <td>{cell}</td>
                  <td className="n" style={{ color: toneVar(m.tone) }}>{m.adherence}%</td>
                  <td style={{ fontSize: '12px' }}>{m.last}</td>
                </ClickRow>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
      <p className="fine">{t('medicines.allergy')}: <b style={{ color: 'var(--bad-text)' }}>{a.allergen}</b> ({a.detail}). {a.checked}</p>
    </GlassCard>
  )
}
