import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'

/** The two router calls the app uses, kept to the `next/navigation` shape it was written against. */
export function useRouter(): { push: (to: string) => void; replace: (to: string) => void } {
  const navigate = useNavigate()
  return useMemo(() => ({
    push: (to: string) => { navigate(to) },
    replace: (to: string) => { navigate(to, { replace: true }) },
  }), [navigate])
}

export function usePathname(): string {
  return useLocation().pathname
}
