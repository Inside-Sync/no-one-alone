'use client'

import { Locked } from '@/components/ui/Locked'
import { getCareRecord } from '@/data/repo'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useRepo } from '@/features/shared/useRepo'
import { EncountersCard } from './EncountersCard'
import { FollowUpCard } from './FollowUpCard'
import { HospitalsCard } from './HospitalsCard'
import { LabsCard } from './LabsCard'
import { MedicinesCard } from './MedicinesCard'
import { RecordKpis } from './RecordKpis'
import { SourcesCard } from './SourcesCard'

/** Individual view · Care record (`<main data-page="record">`): every direct child is tagged `records` (prototype line 1907). */
export function RecordPage() {
  const res = useRepo(() => getCareRecord('margaret'))
  if (res.status === 'error') return <PageError page="record" onRetry={res.retry} />
  const r = res.data
  if (!r) return <PageSkeleton page="record" />
  return (
    <main className="grid" data-page="record">
      <Locked cat="records" span={12}><RecordKpis kpis={r.kpis} /></Locked>
      <Locked cat="records" span={8}><EncountersCard enc={r.encounters} /></Locked>
      <Locked cat="records" span={4}><MedicinesCard record={r} /></Locked>
      <Locked cat="records" span={6}><LabsCard labs={r.labs} /></Locked>
      <Locked cat="records" span={6}><HospitalsCard hospitals={r.hospitals} /></Locked>
      <Locked cat="records" span={7}><SourcesCard sources={r.sources} tag={r.sourcesTag} /></Locked>
      <Locked cat="records" span={5}><FollowUpCard days={r.followUp} note={r.followUpNote} /></Locked>
    </main>
  )
}
