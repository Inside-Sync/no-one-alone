'use client'

import { FAMILY_CHECKS } from '../../../engine'
import type { KindProps } from '../types'
import { Checks, StatusBox, YourTurn, useP } from '../prevention/parts'

/** Step 0 of the family case: the whole family on one page. The tree, the editor and the alerts live in the family dashboard above. */
export function FamHubCard({ snap, r }: KindProps) {
  const t = useP()
  const F = snap.state.fm
  const booked = F ? Object.keys(F.booked).length : 0
  return (
    <>
      <p>{t('fam.hub.intro')}</p>
      <YourTurn mode="ind" what={t('fam.hub.turn')}>
        <ul className="tips">
          <li>{t('fam.hub.tip1')}</li>
          <li>{t('fam.hub.tip2')}</li>
          <li>{t('fam.hub.tip3')}</li>
          <li>{t('fam.hub.tip4')}</li>
          <li>{t('fam.hub.tip5')}</li>
        </ul>
        {booked > 0 && <StatusBox tone="green" title={t('fam.hub.booked', { n: booked, score: snap.famScore })}>{t('fam.hub.nextTrip')}</StatusBox>}
      </YourTurn>
      <Checks items={FAMILY_CHECKS} r={r} />
    </>
  )
}
