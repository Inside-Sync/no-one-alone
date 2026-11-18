'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePathname, useRouter } from '@/app/navigation'
import { Icon } from '@/components/ui/Icon'
import * as repo from '@/data/repo'
import { parsePath } from '@/domain/views'
import { useAppState } from '@/state/AppState'
import s from './shell.module.css'

interface Entry { key: string; label: string; note: string; to: string }

/**
 * Filters people and Abu Dhabi areas; Enter or a click navigates. In the Hospital view a person is a patient, so a
 * result opens their patient record instead of the person's own app.
 */
export function SearchBox() {
  const { t } = useTranslation()
  const router = useRouter()
  const hospital = parsePath(usePathname()).view === 'hospital'
  const { people: sharePeople } = useAppState()
  const [entries, setEntries] = useState<Entry[]>([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    let live = true
    const subsOf = (gov: Awaited<ReturnType<typeof repo.getGovernment>>): Entry[] => gov.areas.map((a) => ({
      key: `s-${a.name}`, label: a.name, note: t('nav.search.suburb'), to: '/government/population',
    }))
    if (hospital) {
      Promise.all([repo.getPatients(), repo.getGovernment()]).then(([data, gov]) => {
        if (!live) return
        const patients: Entry[] = data.patients.map((p) => ({
          key: `r-${p.id}`, label: p.name, note: t('nav.search.patient', { why: p.why }), to: `/hospital/patients?patient=${p.id}&step=sum`,
        }))
        setEntries([...patients, ...subsOf(gov)])
      }, () => {})
      return () => { live = false }
    }
    Promise.all([repo.getPerson('margaret'), repo.getGovernment()]).then(([person, gov]) => {
      if (!live) return
      const people: Entry[] = [
        { key: 'p-margaret', label: person.name, note: t('nav.search.person'), to: '/individual/health' },
        ...sharePeople.map((p) => ({ key: `p-${p.id}`, label: p.name, note: p.role, to: '/individual/health' })),
      ]
      setEntries([...people, ...subsOf(gov)])
    }, () => {})
    return () => { live = false }
  }, [sharePeople, t, hospital])

  const results = useMemo(() => {
    const v = q.trim().toLowerCase()
    if (!v) return []
    return entries.filter((e) => e.label.toLowerCase().includes(v)).slice(0, 8)
  }, [q, entries])

  const go = (e: Entry) => {
    setOpen(false)
    setQ('')
    router.push(e.to)
  }

  return (
    <span className={s.searchWrap}>
      <label className="search">
        <span className="ic"><Icon name="search" /></span>
        <input
          id="q"
          placeholder={t('nav.search.placeholder')}
          aria-label={t('nav.search.label')}
          value={q}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="searchResults"
          aria-autocomplete="list"
          autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0) }}
          onBlur={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { const r = results[active]; if (r) go(r) }
            else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
            else if (e.key === 'Escape') setOpen(false)
          }}
        />
      </label>
      {open && results.length > 0 && (
        <ul className={s.results} id="searchResults" role="listbox" aria-label={t('nav.search.results')}>
          {results.map((r, i) => (
            <li
              key={r.key}
              role="option"
              aria-selected={i === active}
              className={s.result}
              onMouseDown={(e) => { e.preventDefault(); go(r) }}
            >
              <span>{r.label}</span>
              <small>{r.note}</small>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
