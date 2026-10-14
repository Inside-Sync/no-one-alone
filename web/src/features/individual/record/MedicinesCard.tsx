import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { RECORD_COPY } from '@/data/repo'
import type { CareRecord } from '@/data/types'
import { ClickRow } from '../ClickRow'
import { Head } from '../home/parts'

const name = { fontWeight: 500 } as const

/** `Medicines` (c4): 30-day adherence per medicine, interaction pill and the allergy note. */
export function MedicinesCard({ record }: { record: CareRecord }) {
  const c = RECORD_COPY.medicines
  const a = record.allergyNote
  return (
    <GlassCard span={4}>
      <Head title={c.title}><Pill tone={record.medicinesPill.tone}>{record.medicinesPill.text}</Pill></Head>
      <div className="tw">
        <table style={{ minWidth: 0 }}>
          <thead><tr>{c.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody id="meds">
            {record.medicines.map((m) => {
              const cell = <><b style={name}>{m.name}</b><small>{m.timing}</small></>
              return (
                <ClickRow
                  key={m.name}
                  title={m.name}
                  details={[[c.head[0], cell], [c.head[1], `${m.adherence}%`], [c.head[2], m.last]]}
                >
                  <td>{cell}</td>
                  <td className="n" style={{ color: `var(--${m.tone})` }}>{m.adherence}%</td>
                  <td style={{ fontSize: '12px' }}>{m.last}</td>
                </ClickRow>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="fine">{c.allergy}: <b style={{ color: 'var(--bad)' }}>{a.allergen}</b> ({a.detail}). {a.checked}</p>
    </GlassCard>
  )
}
