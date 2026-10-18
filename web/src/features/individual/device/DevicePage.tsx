'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@/app/navigation'
import { Orbit } from '@/components/canvas/Orbit'
import { Icon } from '@/components/ui/Icon'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/components/ui/Toast'
import { apiErrorCode, getDeviceFeed, getOrbitScene } from '@/data/repo'
import { PageError } from '@/features/shared/PageError'
import { PageSkeleton } from '@/features/shared/PageSkeleton'
import { useRepo } from '@/features/shared/useRepo'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import { MiniGrid } from '../home/parts'

const MINI_ORBIT = ['david', 'nurse', 'james', 'sarah']

/** Individual view · Her phone (`<main data-page="device">`): Margaret's home screen and why it is built that way. */
export function DevicePage() {
  const feedRes = useRepo(() => getDeviceFeed('margaret'))
  // The mini orbit is decoration: if it cannot load, its area stays empty and the page still works.
  const scene = useRepo(getOrbitScene).data
  const toast = useToast()
  const router = useRouter()
  const { setWho, dispatchEmergency } = useAppState()
  const { live, start } = useLiveIncident()
  const { t } = useTranslation('live')
  const [busy, setBusy] = useState(false)
  if (feedRes.status === 'error') return <PageError page="device" onRetry={feedRes.retry} />
  const feed = feedRes.data
  if (!feed) return <PageSkeleton page="device" />
  const p = feed.phone
  const h = p.home
  return (
    <main className="grid" data-page="device">
      <GlassCard span={4}>
        <div className="device">
          <div className="dev-screen" id="devHome">
            <span className="dev-h">{h.date}</span>
            <span className="dev-t">{h.greeting}</span>
            <div className="dev-med">
              <b>{h.medicine.title}</b>
              <small>{h.medicine.sub}</small>
              <button type="button" className="btn" onClick={() => toast(h.medicine.toast)}>{h.medicine.button}</button>
            </div>
            <div className="dev-btns">
              <button type="button" className="dev-b ok" onClick={() => toast(h.ok.toast)}>
                <span className="ic"><Icon name="check" /></span>{h.ok.label}
              </button>
              <button
                type="button"
                className="dev-b help"
                disabled={busy}
                onClick={() => {
                  // The demo always runs in the family view (prototype line 2016).
                  if (live) {
                    // Real incident: core-api starts it; Live follows it from Firestore. A demo already running is fine.
                    setBusy(true)
                    start('stroke')
                      .then(() => {
                        setWho('family')
                        router.push('/individual/live')
                      })
                      .catch((e: unknown) => {
                        if (apiErrorCode(e) === 'INVALID_STATE') {
                          setWho('family')
                          router.push('/individual/live')
                        } else toast(t('live.failed'))
                      })
                      .finally(() => setBusy(false))
                    return
                  }
                  setWho('family')
                  dispatchEmergency({ type: 'start' })
                  router.push('/individual/live')
                }}
              >
                <span className="ic"><Icon name="phone" /></span>{h.help.label}
              </button>
            </div>
          </div>
        </div>
      </GlassCard>
      <GlassCard span={8}>
        <div className="ch"><h2>{p.heading}</h2><span className="meta">{p.meta}</span></div>
        {scene && (
          <Orbit
            scene={{ ...scene, nodes: scene.nodes.filter((n) => MINI_ORBIT.includes(n.id)) }}
            ariaLabel="Margaret's family circle"
            labels
            tilt={0.5}
            style={{ height: 260 }}
            onSelect={toast}
          />
        )}
        <MiniGrid stats={p.minis} />
        <ul className="why">
          {p.bullets.map((b) => (
            <li key={b.text}><span className="ic"><Icon name={b.icon} /></span><span>{b.text}</span></li>
          ))}
        </ul>
        <p className="fine">{p.note}</p>
      </GlassCard>
    </main>
  )
}
