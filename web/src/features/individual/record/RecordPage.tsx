'use client'

import { useEffect, useState } from 'react'
import { Locked } from '@/components/ui/Locked'
import { getCareRecord } from '@/data/repo'
import type { CareRecord } from '@/data/types'
import { EncountersCard } from './EncountersCard'
import { FollowUpCard } from './FollowUpCard'
import { HospitalsCard } from './HospitalsCard'
import { LabsCard } from './LabsCard'
import { MedicinesCard } from './MedicinesCard'
import { RecordKpis } from './RecordKpis'
import { SourcesCard } from './SourcesCard'

function useRecord(): CareRecord | null {
  const [data, setData] = useState<CareRecord | null>(null)
  useEffect(() => {
    let live = true
    getCareRecord('margaret')
      .then((r) => { if (live) setData(r) })
      .catch(() => { /* leave the page empty; the shell stays usable */ })
    return () => { live = false }
  }, [])
  return data
}

/** Individual view · Care record (`<main data-page="record">`): every direct child is tagged `records` (prototype line 1907). */
export function RecordPage() {
  const r = useRecord()
  if (!r) return null
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
