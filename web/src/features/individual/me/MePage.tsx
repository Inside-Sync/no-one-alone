'use client'

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@/app/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { GlassCard } from '@/components/ui/GlassCard'
import { OnceButton } from '@/components/ui/OnceButton'
import { useToast } from '@/components/ui/Toast'
import { CATEGORY_IDS, countSees } from '@/domain/consent'
import { useAppState } from '@/state/AppState'
import { useLiveIncident } from '@/state/LiveIncident'
import { RecoveryCard } from './RecoveryCard'
import { PauseButton } from '../privacy/PauseButton'
import { TableScroll } from '@/components/ui/TableScroll'

/** Individual view · My day (`<main data-page="me">`): Margaret's own page, in her words. */
export function MePage() {
  const { people, share, paused } = useAppState()
  const router = useRouter()
  const toast = useToast()
  const { t } = useTranslation('me')
  const { live, incident, people: livePeople } = useLiveIncident()
  const goPrivacy = () => router.push('/individual/privacy')
  return (
    <main className="grid" data-page="me">
      {live && incident?.recovery && <RecoveryCard recovery={incident.recovery} tz={livePeople.person?.timezone ?? 'Australia/Sydney'} />}
      <GlassCard span={8} className="me-hero">
        <span className="hello">{t('hello')}</span>
        <p className="me-sub">{t('sub')}</p>
        <div className="big-tiles">
          {t('tiles', { returnObjects: true }).map((tile) => (
            <button key={tile.title} type="button" className={tile.warn ? 'bt warn' : 'bt'} onClick={() => toast(`${tile.title} · ${tile.note}`)}>
              <span>{tile.emoji}</span><b>{tile.title}</b><small>{tile.note}</small>
            </button>
          ))}
        </div>
      </GlassCard>
      <GlassCard span={4}>
        <div className="ch"><h2>{t('people.title')}</h2><span className="meta">{t('people.meta')}</span></div>
        <ul className="list">
          {people.map((p) => (
            <li key={p.id}>
              <Avatar name={p.name} className="av sm" style={{ '--c': p.color } as CSSProperties}>{p.initials}</Avatar>
              <span><b>{p.name}</b><small>{p.role}</small></span>
              {share && (
                <span className={paused ? 'pill warn' : 'pill plain'}>
                  {paused ? t('people.paused') : t('people.sees', { seen: countSees(share, paused, p.id), total: CATEGORY_IDS.length })}
                </span>
              )}
            </li>
          ))}
        </ul>
        <button type="button" className="btn" onClick={goPrivacy}>{t('people.change')}</button>
      </GlassCard>
      <GlassCard span={6}>
        <div className="ch"><h2>{t('ideasTitle')}</h2><span className="meta">{t('ideasMeta')}</span></div>
        <ul className="list">
          {t('ideas', { returnObjects: true }).map((i) => (
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
        <div className="ch"><h2>{t('promise.title')}</h2><span className="meta">{t('promise.meta')}</span></div>
        <ul className="why promise">
          {t('promise.items', { returnObjects: true }).map((i) => (
            <li key={i.bold}><span>{i.emoji}</span><span><b>{i.bold}</b> {i.text}</span></li>
          ))}
        </ul>
        <div className="row">
          <PauseButton />
          <button type="button" className="btn soft" onClick={goPrivacy}>{t('promise.settings')}</button>
        </div>
      </GlassCard>
      <GlassCard span={12}>
        <div className="ch"><h2>{t('access.title')}</h2><span className="meta">{t('access.meta')}</span></div>
        <TableScroll>
          <table>
            <thead><tr>{t('access.head', { returnObjects: true }).map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {t('access.rows', { returnObjects: true }).map((r) => (
                <tr key={r[0] + r[1]}><td className="n">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </GlassCard>
    </main>
  )
}
