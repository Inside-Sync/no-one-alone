'use client'

import { createElement, type ComponentType } from 'react'
import type { CaseDef, StepKindName } from '../../engine'
import type { KindProps, KindRegistry, ScreenProps, ScreenSet } from '../kinds/types'
import { useA } from './parts'
import { FamilyDashboard as FamilyDashboardImpl, familyKinds, familyScreens, preventionKinds, preventionScreens, safetyKinds, safetyScreens } from './external'

/** Shown when a case family has not delivered a card, a screen or the dashboard (so the overlay is never blank). */
export function NotAvailable({ what }: { what: string }) {
  const t = useA()
  return <div className="empty" role="note">{t('fallback.notYet', { what })}</div>
}

/**
 * Which registry answers first for each family of cases. A kind that exists in several (`report`, `teach`, `tl`...) comes from the family
 * the case belongs to, then from the others, so the safety set (which owns the shared kinds) is the last resort for the other two.
 */
const ORDER: Record<CaseDef['type'], KindRegistry[]> = {
  safety: [safetyKinds, preventionKinds, familyKinds],
  prev: [preventionKinds, familyKinds, safetyKinds],
  fam: [familyKinds, preventionKinds, safetyKinds],
}

export function kindFor(type: CaseDef['type'], kind: StepKindName): ComponentType<KindProps> | null {
  for (const reg of ORDER[type]) if (reg[kind]) return reg[kind]!
  return null
}

const SCREENS: Record<CaseDef['type'], ScreenSet | null> = { safety: safetyScreens, prev: preventionScreens, fam: familyScreens }
export const screensFor = (type: CaseDef['type']): ScreenSet | null => SCREENS[type]

export const FamilyDashboard: ComponentType<ScreenProps> = FamilyDashboardImpl

/** The card of a step kind, from the registries of the case's family (or the "not yet" note). */
export function KindSlot({ type, ...props }: KindProps & { type: CaseDef['type'] }) {
  const K = kindFor(type, props.step.kind)
  return K ? createElement(K, props) : <NotAvailable what={props.step.kind} />
}
