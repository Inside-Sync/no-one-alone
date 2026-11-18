'use client'

import { PV } from '../../../data/prevention'
import { CASES } from '../../../data/cases'
import { tx, type PvId } from '../../../engine'
import type { KindProps } from '../types'
import { StatusBox, YourTurn, tok, useP } from './parts'
import { ReviewQueue } from './queue'

/** Hospital step "Care": the referral. The doctor reviews the agent's proposal; Approve is the engine's `referAct` (plan item Y2). */
export function ReferCard({ engine, snap, r }: KindProps) {
  const t = useP()
  const S = snap.state
  const dn = !!S.done[S.step]
  const route = S.route
  if (S.branch !== 'refer' || !route) {
    return (
      <YourTurn mode="hosp" what={t('refer.actAs')}>
        <StatusBox tone="green" title={t('refer.nothingTitle')}>{t('refer.nothingText')}</StatusBox>
      </YourTurn>
    )
  }
  const refer = r(tx(PV[CASES[S.ck].pv as PvId].refer))
  return (
    <YourTurn mode="hosp" what={t('refer.actAsTeam', { team: r(route.team) })}>
      <p>{r(route.tCap)}.</p>
      {dn && <StatusBox tone="green" title={t('refer.accepted')}>{refer}</StatusBox>}
      <ReviewQueue
        rows={[{ id: 'p9', who: tok(engine, r, 'full'), finding: r(route.tCap), team: refer }]}
        approvedIds={dn ? ['p9'] : []}
        onApprove={() => engine.referAct()}
      />
    </YourTurn>
  )
}
