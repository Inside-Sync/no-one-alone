'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { resolvePage } from '@/domain/views'
import { useAppState } from '@/state/AppState'
import { PagePlaceholder } from './PagePlaceholder'
import { PAGE_REGISTRY } from './registry'

/** Role check on the client (static export has no server redirect). */
export function RoutedPage({ view, page }: { view: string; page: string }) {
  const router = useRouter()
  const { who, hydrated } = useAppState()
  const res = resolvePage(view, page, who)

  useEffect(() => {
    if (hydrated && res.kind === 'redirect') router.replace(res.to)
  }, [hydrated, res, router])

  if (!hydrated || res.kind !== 'ok') return null
  const Page = PAGE_REGISTRY[`${view}/${page}`]
  return Page ? <Page /> : <PagePlaceholder view={view} page={page} />
}
