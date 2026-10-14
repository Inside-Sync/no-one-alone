'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/app/navigation'
import { Orbit } from '@/components/canvas/Orbit'
import { Icon } from '@/components/ui/Icon'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/components/ui/Toast'
import { getDeviceFeed, getOrbitScene } from '@/data/repo'
import type { DeviceFeed, OrbitScene } from '@/data/types'
import { useAppState } from '@/state/AppState'
import { MiniGrid } from '../home/parts'
import s from '@/components/phone/phone.module.css'

const MINI_ORBIT = ['david', 'nurse', 'james', 'sarah']

function useDevicePage(): { feed: DeviceFeed | null; scene: OrbitScene | null } {
  const [feed, setFeed] = useState<DeviceFeed | null>(null)
  const [scene, setScene] = useState<OrbitScene | null>(null)
  useEffect(() => {
    let live = true
    getDeviceFeed('margaret').then((f) => { if (live) setFeed(f) }, () => {})
    getOrbitScene().then((o) => { if (live) setScene(o) }, () => {})
    return () => { live = false }
  }, [])
  return { feed, scene }
}

/** Individual view · Her phone (`<main data-page="device">`): Margaret's home screen and why it is built that way. */
export function DevicePage() {
  const { feed, scene } = useDevicePage()
  const toast = useToast()
  const router = useRouter()
  const { setWho, dispatchEmergency } = useAppState()
  if (!feed) return null
  const p = feed.phone
  const h = p.home
  return (
    <main className="grid" data-page="device">
      <GlassCard span={4}>
        <div className={`device ${s.frame}`}>
          <div className={`dev-screen ${s.screen}`} id="devHome">
            <span className={`dev-h ${s.h}`}>{h.date}</span>
            <span className={`dev-t ${s.t}`}>{h.greeting}</span>
            <div className={`dev-med ${s.med}`}>
              <b>{h.medicine.title}</b>
              <small>{h.medicine.sub}</small>
              <button type="button" className={`btn ${s.btn}`} onClick={() => toast(h.medicine.toast)}>{h.medicine.button}</button>
            </div>
            <div className="dev-btns">
              <button type="button" className={`dev-b ok ${s.btn}`} onClick={() => toast(h.ok.toast)}>
                <span className="ic"><Icon name="check" /></span>{h.ok.label}
              </button>
              <button
                type="button"
                className={`dev-b help ${s.btn}`}
                onClick={() => {
                  // The demo always runs in the family view (prototype line 2016).
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
