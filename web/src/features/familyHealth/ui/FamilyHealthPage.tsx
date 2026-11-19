'use client'

import { FamilyHealthPanel } from './Panel'

/** Individual view · Family health (`<main data-page="lineage">`): the "Noa · family health" panel alone, under the top nav. */
export function FamilyHealthPage() {
  return (
    <main data-page="lineage">
      <FamilyHealthPanel />
    </main>
  )
}
