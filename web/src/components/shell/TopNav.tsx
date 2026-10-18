'use client'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usePathname, useRouter } from '@/app/navigation'
import { BrandMark } from './BrandMark'
import { LocaleSwitch } from './LocaleSwitch'
import { SearchBox } from './SearchBox'
import { Tabs } from './Tabs'
import { ViewSwitcher } from './ViewSwitcher'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { firstPage, parsePath, tabsFor, VIEW_USERS, type ViewId } from '@/domain/views'
import { NIGHT_DEMO_PATH, startNightDemo, stopNightDemo } from '@/features/individual/live/nightDemo'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'

interface Props {
  /** Overrides; by default each shows its `data-toast` copy via `useToast()`. */
  onBellClick?: () => void
  onAvatarClick?: () => void
}

export function TopNav({ onBellClick, onAvatarClick }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const { view, page } = parsePath(usePathname())
  const toastMsg = useToast()
  const { who, setWho, viewer, people, alertActive, packetNew, dispatchEmergency, holdNight, night } = useAppState()
  const { live, reset } = useLiveIncident()
  const onLive = view === 'individual' && page === 'live'

  useEffect(() => {
    document.body.dataset.view = view
  }, [view])

  const tabs = tabsFor(view, who)
  const bellToast = t('nav.bellToast')

  const go = (v: ViewId, p: string) => router.push(`/${v}/${p}`)

  // Signed-in user: Margaret herself, the chosen family viewer, or the view's own user.
  let initials: string = VIEW_USERS[view].initials
  let color: string = VIEW_USERS[view].color
  let name: string = VIEW_USERS[view].name
  let toast: string = VIEW_USERS[view].toast
  if (view === 'individual') {
    if (who === 'self') {
      initials = 'MC'; color = '#0b7f71'; name = 'Margaret Collins'; toast = t('nav.signedInAs', { name })
    } else {
      const p = people.find((x) => x.id === viewer)
      if (p) { initials = p.initials; color = p.color; name = p.name; toast = t('nav.signedInAs', { name: p.name }) }
    }
  }

  const badges: Record<string, string | undefined> = {}
  if (alertActive) {
    badges.live = 'LIVE'
    if (packetNew) badges.ed = '1'
  }

  return (
    <header className="topnav glass">
      <BrandMark />
      <ViewSwitcher view={view} onSelect={(v) => go(v, firstPage(v, who))} />
      <LocaleSwitch />
      <Tabs tabs={tabs} current={page} badges={badges} onSelect={(id) => go(view, id)} />
      <div className="tn-right">
        <SearchBox />
        <button
          type="button"
          role="switch"
          aria-checked={night}
          className={night ? 'btn sos demo-sw' : 'btn soft demo-sw'}
          id="runDemo"
          aria-label={t('nav.demo')}
          // Live mode: the Live page starts a real scenario through core-api; the mock plays the scripted demo.
          // Live mode follows the prototype's startEm: Margaret's own view, the night preset running.
          onClick={() => {
            if (night) {
              // Off: back to the day sky with nothing running. The Emergency page on screen also resets its watch.
              if (!live) dispatchEmergency({ type: 'end' })
              else {
                holdNight(false)
                if (onLive) stopNightDemo()
                else reset().catch(() => {})
              }
              return
            }
            setWho(live ? 'self' : 'family')
            if (!live) dispatchEmergency({ type: 'start' })
            else holdNight(true)
            // Already on the Emergency page: the URL does not remount it, so the event starts the demo there.
            if (live && onLive) startNightDemo()
            else router.push(live ? NIGHT_DEMO_PATH : '/individual/live')
          }}
        >
          <span className="knob" aria-hidden="true"><i /></span>
          <span className="t">{t('nav.demo')}</span>
        </button>
        <button type="button" className="rb" aria-label={t('nav.notifications')} data-toast={bellToast} onClick={onBellClick ?? (() => toastMsg(bellToast))}>
          <span className="ic"><Icon name="bell" /></span>
          <span className="dot"></span>
        </button>
        <Avatar
          as="button"
          name={name}
          type="button"
          id="meAv"
          style={{ '--c': color } as React.CSSProperties}
          aria-label={t('nav.signedInAs', { name })}
          data-toast={toast}
          onClick={onAvatarClick ?? (() => toastMsg(toast))}
        >
          {initials}
        </Avatar>
      </div>
    </header>
  )
}
