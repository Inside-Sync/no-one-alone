'use client'

import { Fragment, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Switch } from '@/components/ui/Switch'
import { LINEAGE_COPY } from '@/data/repo'
import type { Lineage } from '@/data/types'
import { Head } from '../home/parts'

/**
 * `Sharing and consent` (c5). In the prototype these switches only flip
 * `aria-checked` (the document-level `.sw` handler): no toast, no audit entry
 * and no link to the Who-sees-what matrix. They stay local state here too.
 */
export function ConsentCard({ consent }: { consent: Lineage['consent'] }) {
  const c = LINEAGE_COPY.consent
  const [on, setOn] = useState(() => consent.rows.map((r) => [...r.shares]))
  const flip = (row: number, col: number) =>
    setOn((s) => s.map((r, i) => (i === row ? r.map((v, j) => (j === col ? !v : v)) : r)))
  return (
    <GlassCard span={5}>
      <Head title={c.title} meta={c.meta} />
      <div className="cm" id="cm">
        <span></span>
        {consent.columns.map((h) => <span key={h} className="h">{h}</span>)}
        {consent.rows.map((r, i) => (
          <Fragment key={r.person}>
            <span>{r.person}</span>
            {consent.columns.map((h, j) => (
              <Switch key={h} checked={on[i][j]} onChange={() => flip(i, j)} label={c.shares(r.person, h)} />
            ))}
          </Fragment>
        ))}
      </div>
      <p className="fine">{consent.note}</p>
    </GlassCard>
  )
}
