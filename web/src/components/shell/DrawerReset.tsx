'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from '@/app/navigation'
import { useDrawer } from '@/components/ui/Drawer'
import { useAppState } from '@/state/AppState'

/**
 * Review Focus 1: a drawer's body was built for one role, viewer and set of consent switches. When any of them
 * (or the route, which covers browser Back) changes, close the drawer and drop its body at once, so data the
 * viewer may no longer see never stays in the DOM. Lives inside both AppStateProvider and DrawerProvider.
 */
export function DrawerReset() {
  const { who, viewer, paused, share } = useAppState()
  const pathname = usePathname()
  const { reset } = useDrawer()

  useEffect(() => {
    // On mount the drawer is already closed and empty, so this is a no-op then.
    reset()
  }, [who, viewer, paused, pathname, reset])

  // Consent arriving for the first time (null -> matrix) only ends the "Checking" state: while it was null every
  // consent-tagged card was locked, so no drawer could show gated data. Any later change resets.
  const prevShare = useRef(share)
  useEffect(() => {
    const was = prevShare.current
    prevShare.current = share
    if (was !== null && was !== share) reset()
  }, [share, reset])
  return null
}
