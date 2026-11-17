'use client'

import { useCallback, useContext, useState } from 'react'
import { UNSAFE_LocationContext } from 'react-router'
import { useRouter } from '@/app/navigation'

/**
 * The care-record step kept in the `?step=` query, so a link or the walkthrough can open a step, also while the page is already open.
 * Returns `[stepId, setStep]`: `stepId` is the query value when it is one of `ids`, else `fallback`; `setStep` updates the query
 * (replacing the history entry). Outside a router (a test, a story) it keeps the step in component state instead.
 */
export function useStepParam(ids: readonly string[], fallback: string): [string, (id: string) => void] {
  const loc = useContext(UNSAFE_LocationContext)
  const router = useRouter()
  const search = loc ? loc.location.search : ''
  const raw = new URLSearchParams(search).get('step')
  const [local, setLocal] = useState<string | undefined>()
  const [seen, setSeen] = useState(raw)
  // A new query value (a link, the walkthrough) wins over what was picked by hand.
  if (seen !== raw) { setSeen(raw); setLocal(undefined) }
  const fromQuery = raw && ids.includes(raw) ? raw : undefined
  const current = local ?? fromQuery ?? fallback
  const pathname = loc?.location.pathname
  const setStep = useCallback((id: string) => {
    setLocal(id)
    if (pathname) router.replace(`${pathname}?step=${id}`)
  }, [pathname, router])
  return [current, setStep]
}
