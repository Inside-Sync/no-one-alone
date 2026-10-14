'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@/app/navigation'
import { Icon } from '@/components/ui/Icon'
import * as repo from '@/data/repo'
import { useAppState } from '@/state/AppState'
import s from './shell.module.css'

interface Entry { key: string; label: string; note: string; to: string }

/** Filters people and suburbs from fixtures; Enter or a click navigates. */
export function SearchBox() {
  const router = useRouter()
  const { people: sharePeople } = useAppState()
  const [entries, setEntries] = useState<Entry[]>([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    let live = true
    Promise.all([repo.getPerson('margaret'), repo.getCommunity()]).then(([person, community]) => {
      if (!live) return
      const people: Entry[] = [
        { key: 'p-margaret', label: person.name, note: 'Person', to: '/individual/home' },
        ...sharePeople.map((p) => ({ key: `p-${p.id}`, label: p.name, note: p.role, to: '/individual/home' })),
      ]
      const subs: Entry[] = community.suburbs.map((sb) => ({
        key: `s-${sb.name}`, label: sb.name, note: 'Suburb · Inner West', to: '/community/community',
      }))
      setEntries([...people, ...subs])
    }, () => {})
    return () => { live = false }
  }, [sharePeople])

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
          placeholder="Search people, suburbs…"
          aria-label="Search"
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
        <ul className={s.results} id="searchResults" role="listbox" aria-label="Search results">
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
