'use client'

import { Trans, useTranslation } from 'react-i18next'
import { usePathname, useRouter } from '@/app/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Glyph } from '@/components/ui/Icon'
import { WhoSwitch } from './WhoSwitch'
import { STEPS } from '@/domain/emergency'
import { CATEGORY_IDS, countSees } from '@/domain/consent'
import { pageContext, pageTitle, parsePath, VIEW_LABELS } from '@/domain/views'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import { useShellOverrides } from './ShellOverrides'
import s from './shell.module.css'

export function ContextBar() {
  const { t } = useTranslation(['common', 'live'])
  const router = useRouter()
  const { view, page } = parsePath(usePathname())
  const { who, setWho, setViewer, viewer, paused, share, people, emergency } = useAppState()
  const { view: liveView, people: livePeople } = useLiveIncident()
  const override = useShellOverrides().context

  const base = pageContext(view, who, page)
  const ctx = base && { ...base, ...override }
  const title = override?.title ?? (page ? pageTitle(view, page, who) : '')

  const individual = view === 'individual'
  const self = who === 'self'
  const viewerInfo = people.find((p) => p.id === viewer)
  const viewerName = viewerInfo?.name ?? ''
  const sees = share ? countSees(share, paused, viewer) : 0

  /** Live incident subtitle: story time and the address without its " (fictional)" tag, or the time alone. */
  const liveSubtitle = (time: string, address?: string) =>
    address
      ? t('live:liveSubtitle', { time, address: address.replace(/\s*\(fictional\)$/, '') })
      : t('live:liveSubtitleShort', { time })

  const banner = !individual
    ? VIEW_LABELS[view]
    : self
      ? t('context.selfBanner')
      : t('context.familyBanner', { viewerName })

  const switchWho = (w: typeof who) => {
    setWho(w)
    if (w === 'family') setViewer('james')
    router.push(w === 'self' ? '/individual/me' : '/individual/health')
  }

  return (
    <>
      <section className="ctx glass" aria-live="polite" data-tour="context">
        <Avatar
          name={individual && ctx?.initials === 'MH' ? 'Moza' : undefined}
          id="ctxAv"
          style={{ '--c': ctx?.color ?? '#0b7f71', width: 46, height: 46, fontSize: 15 } as React.CSSProperties}
        >
          {ctx?.initials}
        </Avatar>
        <div>
          <span className="vbanner" id="vban">{banner}</span>
          <h1 id="pgTitle">{title}</h1>
          <div className="sub" id="pgSub">{page === 'live' && liveView?.open ? liveSubtitle(liveView.storyTime, livePeople.person?.addressText) : page === 'live' && emergency.active ? t('live:subtitle', { time: STEPS[emergency.step].t }) : ctx?.sub}</div>
        </div>
        <span className="sp"></span>
        {individual && <WhoSwitch who={who} onSelect={switchWho} />}
        <div className="facts" id="facts">
          {individual && !self && share && (
            <span className="fact"><i></i><Trans t={t} i18nKey="context.sees" values={{ viewerName, seen: sees, total: CATEGORY_IDS.length }} components={{ b: <b /> }} /></span>
          )}
          {ctx?.facts.map((f) => (
            <span className="fact" key={f.label}>{f.live && <i></i>}{f.label} <b>{f.value}</b></span>
          ))}
        </div>
      </section>
      {individual && !self && paused && (
        <div className={`glass ${s.pauseBanner}`} id="pauseBanner">
          <Glyph name="pause" /><b>{t('context.pausedBold')}</b> {t('context.pausedRest')}
        </div>
      )}
    </>
  )
}
