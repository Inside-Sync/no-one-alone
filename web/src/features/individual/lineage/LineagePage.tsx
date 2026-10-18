'use client'

import { getLineage } from '@/data/repo'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useRepo } from '@/features/shared/useRepo'
import { ConsentCard } from './ConsentCard'
import { MatrixCard } from './MatrixCard'
import { Pedigree } from './Pedigree'
import { ScreeningCard } from './ScreeningCard'
import { StrengthCard } from './StrengthCard'

/** Individual view · Health Lineage (`<main data-page="lineage">`). No card carries a consent tag in the prototype. */
export function LineagePage() {
  const r = useRepo(() => getLineage('margaret'))
  if (r.status === 'error') return <PageError page="lineage" onRetry={r.retry} />
  const l = r.data
  if (!l) return <PageSkeleton page="lineage" />
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
