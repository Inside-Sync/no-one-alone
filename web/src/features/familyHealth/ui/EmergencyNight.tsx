import { useEffect } from 'react'
import { useSnapshot } from './store'

/**
 * A family-health emergency puts the whole app in the night palette until the emergency ends (Next journey, Reset), on every view
 * (prototype `onEm`): mounted by the shell, not by the panel, so switching to Hospital or Government keeps it.
 */
export function EmergencyNight() {
  const { emergency } = useSnapshot()
  useEffect(() => {
    if (!emergency) return
    const body = document.body, had = body.classList.contains('night')
    body.classList.add('night')
    return () => { if (!had && body.dataset.theme !== 'dark') body.classList.remove('night') }
  }, [emergency])
  return null
}
