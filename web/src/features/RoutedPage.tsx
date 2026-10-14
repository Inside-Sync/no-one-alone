'use client'

import { useEffect } from 'react'
import { useRouter } from '@/app/navigation'
import { resolvePage } from '@/domain/views'
import { useAppState } from '@/state/AppState'
import { PAGE_REGISTRY } from './registry'

/** Role check on the client (static export has no server redirect). */
export function RoutedPage({ view, page }: { view: string; page: string }) {
  const router = useRouter()
  const { who, hydrated } = useAppState()
  const res = resolvePage(view, page, who)
  // `res` is a new object every render; depend on its fields so the effect only re-runs when the outcome changes.
  const kind = res.kind
  const to = res.kind === 'redirect' ? res.to : null

  useEffect(() => {
    if (hydrated && kind === 'redirect' && to) router.replace(to)
  }, [hydrated, kind, to, router])

  if (!hydrated || res.kind !== 'ok') return null
  const Page = PAGE_REGISTRY[`${view}/${page}`]
  // Every route in allRoutes() is registered (tests/features/registry.test.ts), so this is never null in practice.
  return Page ? <Page /> : null
}
