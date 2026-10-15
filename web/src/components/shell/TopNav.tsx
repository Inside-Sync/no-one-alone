'use client'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usePathname, useRouter } from '@/app/navigation'
import { BrandMark } from './BrandMark'
import { LocaleSwitch } from './LocaleSwitch'
import { SearchBox } from './SearchBox'
import { Tabs } from './Tabs'
import { ViewSwitcher } from './ViewSwitcher'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { firstPage, parsePath, tabsFor, VIEW_USERS, type ViewId } from '@/domain/views'
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
  const { who, setWho, viewer, people, alertActive, packetNew, dispatchEmergency } = useAppState()
  const { live } = useLiveIncident()

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
          className="btn sos"
          id="runDemo"
          aria-label={t('nav.demo')}
          // Live mode: the Live page starts a real scenario through core-api; the mock plays the scripted demo.
          onClick={() => { setWho('family'); if (!live) dispatchEmergency({ type: 'start' }); router.push('/individual/live') }}
        >
          <span className="ic"><Icon name="bolt" /></span>
          <span className="t">{t('nav.demo')}</span>
        </button>
        <button type="button" className="rb" aria-label={t('nav.notifications')} data-toast={bellToast} onClick={onBellClick ?? (() => toastMsg(bellToast))}>
          <span className="ic"><Icon name="bell" /></span>
          <span className="dot"></span>
        </button>
        <button
          type="button"
          className="av"
          id="meAv"
          style={{ '--c': color } as React.CSSProperties}
          aria-label={t('nav.signedInAs', { name })}
          data-toast={toast}
          onClick={onAvatarClick ?? (() => toastMsg(toast))}
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
