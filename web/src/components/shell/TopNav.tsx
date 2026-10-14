'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from '@/app/navigation'
import { BrandMark } from './BrandMark'
import { SearchBox } from './SearchBox'
import { Tabs } from './Tabs'
import { ViewSwitcher } from './ViewSwitcher'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { firstPage, parsePath, tabsFor, VIEW_USERS, type ViewId } from '@/domain/views'
import { useAppState } from '@/state/AppState'

const BELL_TOAST = '3 updates today: 2 routine, 1 needs your approval'

interface Props {
  /** Overrides; by default each shows its `data-toast` copy via `useToast()`. */
  onBellClick?: () => void
  onAvatarClick?: () => void
}

export function TopNav({ onBellClick, onAvatarClick }: Props) {
  const router = useRouter()
  const { view, page } = parsePath(usePathname())
  const toastMsg = useToast()
  const { who, setWho, viewer, people, emergency, packetNew, dispatchEmergency } = useAppState()

  useEffect(() => {
    document.body.dataset.view = view
  }, [view])

  const tabs = tabsFor(view, who)

  const go = (v: ViewId, p: string) => router.push(`/${v}/${p}`)

  // Signed-in user: Margaret herself, the chosen family viewer, or the view's own user.
  let initials: string = VIEW_USERS[view].initials
  let color: string = VIEW_USERS[view].color
  let name: string = VIEW_USERS[view].name
  let toast: string = VIEW_USERS[view].toast
  if (view === 'individual') {
    if (who === 'self') {
      initials = 'MC'; color = '#0b7f71'; name = 'Margaret Collins'; toast = 'Signed in as Margaret Collins'
    } else {
      const p = people.find((x) => x.id === viewer)
      if (p) { initials = p.initials; color = p.color; name = p.name; toast = `Signed in as ${p.name}` }
    }
  }

  const badges: Record<string, string | undefined> = {}
  if (emergency.active) {
    badges.live = 'LIVE'
    if (packetNew) badges.ed = '1'
  }

  return (
    <header className="topnav glass">
      <BrandMark />
      <ViewSwitcher view={view} onSelect={(v) => go(v, firstPage(v, who))} />
      <Tabs tabs={tabs} current={page} badges={badges} onSelect={(id) => go(view, id)} />
      <div className="tn-right">
        <SearchBox />
        <button
          type="button"
          className="btn sos"
          id="runDemo"
          onClick={() => { setWho('family'); dispatchEmergency({ type: 'start' }); router.push('/individual/live') }}
        >
          <span className="ic"><Icon name="bolt" /></span>
          <span className="t">Night alert demo</span>
        </button>
        <button type="button" className="rb" aria-label="Notifications" data-toast={BELL_TOAST} onClick={onBellClick ?? (() => toastMsg(BELL_TOAST))}>
          <span className="ic"><Icon name="bell" /></span>
          <span className="dot"></span>
        </button>
        <button
          type="button"
          className="av"
          id="meAv"
          style={{ '--c': color } as React.CSSProperties}
          aria-label={`Signed in as ${name}`}
          data-toast={toast}
          onClick={onAvatarClick ?? (() => toastMsg(toast))}
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
