'use client'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usePathname, useRouter } from '@/app/navigation'
import { BrandMark } from './BrandMark'
import { LocaleSwitch } from './LocaleSwitch'
import { SearchBox } from './SearchBox'
import { Tabs } from './Tabs'
import { ThemeSwitch } from './ThemeSwitch'
import { ViewSwitcher } from './ViewSwitcher'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { firstPage, parsePath, tabsFor, VIEW_USERS, type ViewId } from '@/domain/views'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import { useNightDemo } from '@/state/useNightDemo'
import { useTour } from '@/state/Tour'
import { TestCaseButton } from '@/features/testcase/entry/TestCaseButton'

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
  const { who, viewer, people, alertActive, packetNew } = useAppState()
  const demo = useNightDemo()
  const tour = useTour()
  const liveIncident = useLiveIncident()

  useEffect(() => {
    document.body.dataset.view = view
  }, [view])

  const tabs = tabsFor(view, who, page)
  const bellToast = t('nav.bellToast')

  const go = (v: ViewId, p: string) => router.push(`/${v}/${p}`)

  // Signed in as: Moza herself, the chosen family viewer, or the view's own user.
  let initials: string = VIEW_USERS[view].initials
  let color: string = VIEW_USERS[view].color
  let name: string = VIEW_USERS[view].name
  let toast: string = VIEW_USERS[view].toast
  if (view === 'individual') {
    if (who === 'self') {
      initials = t('nav.selfInitials'); color = '#0b7f71'; name = t('nav.selfName'); toast = t('nav.signedInAs', { name })
    } else {
      const p = people.find((x) => x.id === viewer)
      if (p) { initials = p.initials; color = p.color; name = p.name; toast = t('nav.signedInAs', { name: p.name }) }
    }
  }

  const badges: Record<string, string | undefined> = {}
  if (alertActive) {
    // The scripted demo replays a night; only a real incident from core-api is live.
    badges.live = liveIncident.live ? t('nav.liveBadge') : t('nav.replayBadge')
    if (packetNew) badges.ed = '1'
  }

  return (
    <header className="topnav glass">
      <BrandMark />
      <ViewSwitcher view={view} onSelect={(v) => go(v, firstPage(v, who))} />
      <LocaleSwitch />
      <Tabs tabs={tabs} current={page} badges={badges} onSelect={(id) => go(view, id)} />
      <div className="tn-right">
        <ThemeSwitch />
        <SearchBox />
        <button type="button" className="btn" id="runCase" aria-label={t('nav.tour')} onClick={tour.start}>
          <span className="ic"><Icon name="play" /></span>
          <span className="t">{t('nav.tour')}</span>
        </button>
        <TestCaseButton />
        <button
          type="button"
          role="switch"
          aria-checked={demo.night}
          className="btn sos demo-sw"
          id="runDemo"
          aria-label={t('nav.demo')}
          // Live mode: the Live page starts a real scenario through core-api; the mock plays the scripted demo.
          onClick={demo.toggle}
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
