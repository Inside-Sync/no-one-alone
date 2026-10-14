'use client'

import type { CSSProperties } from 'react'
import { useRouter } from '@/app/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { OnceButton } from '@/components/ui/OnceButton'
import { useToast } from '@/components/ui/Toast'
import { ME_COPY } from '@/data/repo'
import { CATEGORY_IDS, countSees } from '@/domain/consent'
import { useAppState } from '@/state/AppState'
import { PauseButton } from '../privacy/PauseButton'
import { TableScroll } from '@/components/ui/TableScroll'

/** Individual view · My day (`<main data-page="me">`): Margaret's own page, in her words. */
export function MePage() {
  const { people, share, paused } = useAppState()
  const router = useRouter()
  const toast = useToast()
  const c = ME_COPY
  const goPrivacy = () => router.push('/individual/privacy')
  return (
    <main className="grid" data-page="me">
      <GlassCard span={8} className="me-hero">
        <span className="hello">{c.hello}</span>
        <p className="me-sub">{c.sub}</p>
        <div className="big-tiles">
          {c.tiles.map((t) => (
            <button key={t.title} type="button" className={t.warn ? 'bt warn' : 'bt'} onClick={() => toast(`${t.title} · ${t.note}`)}>
              <span>{t.emoji}</span><b>{t.title}</b><small>{t.note}</small>
            </button>
          ))}
        </div>
      </GlassCard>
      <GlassCard span={4}>
        <div className="ch"><h2>{c.people.title}</h2><span className="meta">{c.people.meta}</span></div>
        <ul className="list">
          {people.map((p) => (
            <li key={p.id}>
              <span className="av sm" style={{ '--c': p.color } as CSSProperties}>{p.initials}</span>
              <span><b>{p.name}</b><small>{p.role}</small></span>
              {share && (
                <span className={paused ? 'pill warn' : 'pill plain'}>
                  {paused ? 'Paused' : `Sees ${countSees(share, paused, p.id)} of ${CATEGORY_IDS.length}`}
                </span>
              )}
            </li>
          ))}
        </ul>
        <button type="button" className="btn" onClick={goPrivacy}>{c.people.change}</button>
      </GlassCard>
      <GlassCard span={6}>
        <div className="ch"><h2>{c.ideasTitle}</h2><span className="meta">{c.ideasMeta}</span></div>
        <ul className="list">
          {c.ideas.map((i) => (
            <li key={i.title}>
              <span className="li" style={{ fontSize: 16 }}>{i.emoji}</span>
              <span><b>{i.title}</b><small>{i.note}</small></span>
              <span className="row">
                <OnceButton className="sm" toast={i.yes[1]} done={`✓ ${i.yes[2]}`}>{i.yes[0]}</OnceButton>
                <OnceButton className="sm soft" toast={i.no[1]} done={`✓ ${i.no[2]}`}>{i.no[0]}</OnceButton>
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>
      <GlassCard span={6}>
        <div className="ch"><h2>{c.promise.title}</h2><span className="meta">{c.promise.meta}</span></div>
        <ul className="why promise">
          {c.promise.items.map((i) => (
            <li key={i.bold}><span>{i.emoji}</span><span><b>{i.bold}</b> {i.text}</span></li>
          ))}
        </ul>
        <div className="row">
          <PauseButton />
          <button type="button" className="btn soft" onClick={goPrivacy}>{c.promise.settings}</button>
        </div>
      </GlassCard>
      <GlassCard span={12}>
        <div className="ch"><h2>{c.access.title}</h2><span className="meta">{c.access.meta}</span></div>
        <TableScroll>
          <table>
            <thead><tr>{c.access.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {c.access.rows.map((r) => (
                <tr key={r[0] + r[1]}><td className="n">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </GlassCard>
    </main>
  )
}
