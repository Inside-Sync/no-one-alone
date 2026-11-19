'use client'

import { useTranslation } from 'react-i18next'
import { Glyph } from '@/components/ui/Icon'
import { FAMILY_BADGES, FAMILY_CONNECTIONS, FAMILY_MEMBERS, FAMILY_SOURCES } from '../../../data/family'
import { tx } from '../../../engine'
import type { ScreenProps } from '../types'
import { useP } from '../prevention/parts'
import { FamilyAlerts } from './Alerts'
import { FamilyEditor } from './Editor'
import { FamilyForecast } from './Forecast'
import { FamilyTree } from './Tree'
import './family.css'

const LANE_W = 300
const LANE_H = 58

/** The lifelong-journey lane: 0 to 6 well-child visits, 18 to 75 IFHAS, 75+ doctor-led, with the eight members placed by age (prototype lane). */
function Lane({ r, ages }: Pick<ScreenProps, 'r'> & { ages: Record<string, number> }) {
  const t = useP()
  const { i18n } = useTranslation()
  const rtl = i18n.dir() === 'rtl'
  const x = (a: number) => {
    const px = 8 + (Math.min(a, 85) / 85) * (LANE_W - 16)
    return rtl ? LANE_W - px : px
  }
  const seg = (a: number, b: number, c: string, label: string, edge: 'start' | 'mid' | 'end') => {
    const x1 = Math.min(x(a), x(b)), x2 = Math.max(x(a), x(b))
    // A label that would run off the lane is anchored to the lane's own edge (which edge flips in right-to-left).
    const left = edge === 'start' ? !rtl : edge === 'end' ? rtl : null
    const tx0 = left === null ? (x1 + x2) / 2 : left ? x1 : x2
    return (
      <g key={label}>
        <rect x={x1} y={20} width={x2 - x1} height={10} rx={4} fill={c} />
        <text x={tx0} y={44} textAnchor={left === null ? 'middle' : left ? 'start' : 'end'} fill="var(--muted)">{label}</text>
      </g>
    )
  }
  const sorted = FAMILY_MEMBERS.slice().sort((a, b) => ages[a.id] - ages[b.id])
  return (
    <svg className="tcp-lane" viewBox={`0 0 ${LANE_W} ${LANE_H}`} role="img" aria-label={t('fam.dash.laneLabel')}>
      {seg(0, 6, 'var(--m-ind)', t('fam.dash.lane0'), 'start')}
      {seg(18, 75, 'var(--m-hosp)', t('fam.dash.lane1'), 'mid')}
      {seg(75, 85, 'var(--m-gov)', t('fam.dash.lane2'), 'end')}
      {sorted.map((m, i) => (
        <g key={m.id}>
          <circle cx={x(ages[m.id])} cy={25} r={5} fill="var(--solid)" stroke="var(--ink)" strokeWidth={1.5} />
          <text x={x(ages[m.id])} y={i % 2 ? 56 : 13} textAnchor="middle" fill="var(--ink)">{r(tx(m.name))}</text>
        </g>
      ))}
    </svg>
  )
}

/**
 * The family dashboard (layout region `familyDashboard`, prototype renderFamDash): the passport score and the goal "everyone up to date by
 * 30 November", badges; the family tree of four generations, the profile editor and Noa Forecast of the selected person; the six sources,
 * the connections across the family and Noa's alerts (book, accept, keep the date, not now; heart-risk alerts). Plan item Y1 sits on Khalid's alert.
 */
export function FamilyDashboard(p: ScreenProps) {
  const { snap, r } = p
  const t = useP()
  const F = snap.state.fm
  if (!F) return null
  const total = FAMILY_MEMBERS.length
  const score = snap.famScore
  const up = snap.famUp
  const member = (id: string) => FAMILY_MEMBERS.find((m) => m.id === id)!
  const circ = 2 * Math.PI * 26
  const ages = Object.fromEntries(Object.entries(F.prof).map(([k, q]) => [k, q.child ? q.ageM / 12 : q.age]))
  return (
    <>
      <div className="fd-h">
        <div className="fd-score">
          <div className="fd-ring">
          <svg viewBox="0 0 64 64" width="64" height="64" role="img" aria-label={t('fam.dash.score', { score })}>
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--sunk)" strokeWidth="7" />
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--m-ind)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${((score / 100) * circ).toFixed(1)} 999`} transform="rotate(-90 32 32)" />
            <text x="32" y="37" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)">{score}%</text>
          </svg>
          <small className="fd-ringlab">{t('fam.dash.scoreLabel')}</small>
          </div>
          <div>
            <b>{t('fam.dash.title')}</b>
            <span>{t('fam.dash.upOf', { n: up, total })}</span>
            <div className="goal" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={up} aria-label={t('fam.dash.goal', { n: up, total })}><i style={{ inlineSize: `${((up / total) * 100).toFixed(0)}%` }} /></div>
          </div>
        </div>
        <ul className="badges" aria-label={t('fam.dash.badges')}>
          {F.badges.map((b) => <li key={b} className="bdg"><Glyph name={FAMILY_BADGES[b].icon} /> {r(tx(FAMILY_BADGES[b].label))}</li>)}
        </ul>
      </div>
      <div className="fd-top">
        <div>
          <span className="lab">{t('fam.tree.label')}</span>
          <FamilyTree {...p} />
          <div className="lanebox"><Lane r={r} ages={ages} /></div>
        </div>
        <div className="pfed"><FamilyEditor {...p} /></div>
        <div className="fcbox"><FamilyForecast {...p} /></div>
      </div>
      <div className="fd-cols2">
        <div>
          <span className="lab">{t('fam.dash.connected')}</span>
          <div className="srcs">
            {FAMILY_SOURCES.map((s, i) => <div key={i} className="src1"><b>{r(tx(s.name))}</b><span>{r(tx(s.note))}</span></div>)}
          </div>
          <p className="note">{t('fam.dash.consent')}</p>
          <span className="lab">{t('fam.dash.insight')}</span>
          <div className="conns">
            {F.conn.map((c) => {
              const x = FAMILY_CONNECTIONS[c]
              return (
                <div key={c} className={`conn${c === 'C4' || c === 'C5' || c === 'C8' ? ' new' : ''}`}>
                  <span className="ci"><Glyph name={x.icon} /></span>
                  <div>
                    <b>{r(tx(x.from))} → {x.to.map((id) => r(tx(member(id).name))).join(', ')}</b>
                    <span>{r(tx(x.title))}</span>
                    <em>{r(tx(x.action))}</em>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <FamilyAlerts {...p} />
        </div>
      </div>
    </>
  )
}
