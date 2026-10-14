'use client'

import { useEffect, useState } from 'react'
import { getLineage } from '@/data/repo'
import type { Lineage } from '@/data/types'
import { ConsentCard } from './ConsentCard'
import { MatrixCard } from './MatrixCard'
import { Pedigree } from './Pedigree'
import { ScreeningCard } from './ScreeningCard'
import { StrengthCard } from './StrengthCard'

function useLineage(): Lineage | null {
  const [data, setData] = useState<Lineage | null>(null)
  useEffect(() => {
    let live = true
    getLineage('margaret')
      .then((l) => { if (live) setData(l) })
      .catch(() => { /* leave the page empty; the shell stays usable */ })
    return () => { live = false }
  }, [])
  return data
}

/** Individual view · Health Lineage (`<main data-page="lineage">`). No card carries a consent tag in the prototype. */
export function LineagePage() {
  const l = useLineage()
  if (!l) return null
  return (
    <main className="grid" data-page="lineage">
      <Pedigree lineage={l} />
      <div className="c5" style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
        <StrengthCard heading={l.strengthHeading} rows={l.strength} note={l.strengthNote} />
        <ScreeningCard lineage={l} />
      </div>
      <MatrixCard lineage={l} />
      <ConsentCard consent={l.consent} />
    </main>
  )
}
