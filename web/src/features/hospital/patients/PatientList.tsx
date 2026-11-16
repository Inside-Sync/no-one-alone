'use client'

import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import type { PatientData, PatientsData } from '@/data/patients.types'
import { HospitalKpis } from '../shared'
import { initialsOf } from './context'

type Filter = 'all' | 'act' | 'dis' | 'scr'
const FILTERS: readonly Filter[] = ['all', 'act', 'dis', 'scr']

const matches = (p: PatientData, f: Filter) => f === 'all' || (f === 'act' ? p.action : p.kind === f)

/** The four KPIs, with the needs-action tile following the reviews done on this page. */
function Kpis({ data, patients }: { data: PatientsData; patients: readonly PatientData[] }) {
  const need = patients.filter((p) => p.action).length
  const kpis = data.kpis.map((k, i) => {
    if (i === 0) return { ...k, value: String(patients.length) }
    if (i === 1) return { ...k, value: String(need), spark: [...k.spark.slice(0, -1), need] }
    if (i === 2) return { ...k, value: String(patients.filter((p) => p.kind === 'dis').length) }
    return k
  })
  return <HospitalKpis id="ptKpis" kpis={kpis} />
}

/** Hospital · Patient records, the list: four KPIs, then every patient with a filter and a search. */
export function PatientList({ data, patients, onOpen }: { data: PatientsData; patients: readonly PatientData[]; onOpen: (id: string) => void }) {
  const { t } = useTranslation('patients')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = patients.filter((p) => matches(p, filter) && (!q || `${p.name} ${p.why} ${p.area}`.toLowerCase().includes(q)))
  return (
    <main className="grid" data-page="patients">
      <Kpis data={data} patients={patients} />
      <GlassCard span={12} id="ptList" tour="patient-list">
        <div className="ch"><h2>{t('list.title')}</h2><span className="meta" aria-live="polite">{t('list.count', { n: shown.length, total: patients.length })}</span></div>
        <label className="search pt-search">
          <span className="ic" aria-hidden="true"><Icon name="search" /></span>
          <input type="search" value={query} placeholder={t('list.search')} aria-label={t('list.searchAria')} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="seg pt-seg" role="group" aria-label={t('list.filtersAria')}>
          {FILTERS.map((f) => <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{t(`list.filters.${f}`)}</button>)}
        </div>
        <div className="pt-grid" id="ptRows">
          {shown.map((p, i) => (
            <button key={p.id} type="button" className={`msg${i === 0 && p.id === 'moza' ? ' on' : ''}`} data-pt={p.id} aria-label={t('list.openAria', { name: p.name })} onClick={() => onOpen(p.id)}>
              <span className="av" style={{ '--c': p.kind === 'dis' ? '#2563a8' : '#0b7f71' } as CSSProperties}>{initialsOf(p.name)}</span>
              <span>
                <b>{t('list.nameAge', { name: p.name, age: p.age })}</b>
                <small>{p.why}</small>
                <small>{t('list.meta', { day: p.day, last: p.last })}</small>
              </span>
              <Pill tone={p.status.tone}>{p.status.label}</Pill>
            </button>
          ))}
          {!shown.length && <p className="fine">{t('list.empty')}</p>}
        </div>
      </GlassCard>
    </main>
  )
}
