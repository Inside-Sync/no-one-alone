'use client'

import { Icon } from '@/components/ui/Icon'
import { CASES, CASE_GROUPS } from '../../data/cases'
import { PEOPLE, PERSON_IDS } from '../../data/people'
import { tx, type CaseId, type PersonId } from '../../engine'
import { useA, type SessionProps } from './parts'

const NIGHT_START = 72
const MORNING_START = 490

/** All ten cases in the prototype's three groups (the whole family, prevention and screening, the safety net), with icon and teaser. */
export function CasePicker({ s }: SessionProps) {
  const t = useA()
  const { engine, snap, r } = s
  const S = snap.state
  const age = (id: PersonId) => (PEOPLE[id].child && PEOPLE[id].t.age ? r(tx(PEOPLE[id].t.age!)) : PEOPLE[id].age)
  const card = (id: CaseId) => {
    const c = CASES[id], p = PEOPLE[c.person]
    const sub = id === 'own' || id === 'family' ? r(tx(c.teaser)) : `${r(tx(p.t.n!))}, ${age(c.person)} · ${r(tx(c.teaser))}`
    return (
      <button key={id} type="button" className={`cs${S.ck === id ? ' on' : ''}`} aria-pressed={S.ck === id} onClick={() => s.pick(id)}>
        <span className="ci" aria-hidden="true"><span className="ic"><Icon name={c.icon} tint /></span></span>
        <span><b>{r(tx(c.title))}</b><small>{sub}</small></span>
      </button>
    )
  }
  return (
    <>
      {CASE_GROUPS.map((g) => (
        <div key={g.id} className="tc-group">
          <span className="lab">{t(`picker.group.${g.id}`)}</span>
          <div className="cases">{g.cases.map(card)}</div>
        </div>
      ))}
      {S.ck === 'own' && S.phase === 'setup' && (
        <div className="ownrow">
          <span className="lab">{t('picker.person')}</span>
          {PERSON_IDS.map((id) => (
            <button key={id} type="button" className={`chip${S.pk === id ? ' on' : ''}`} aria-pressed={S.pk === id} onClick={() => engine.setPerson(id)}>{r(tx(PEOPLE[id].t.n!))}, {age(id)}</button>
          ))}
          <span className="lab tc-time-lab">{t('picker.time')}</span>
          <button type="button" className={`chip${S.start < 360 ? ' on' : ''}`} aria-pressed={S.start < 360} onClick={() => engine.setStart(NIGHT_START)}>{t('picker.night')}</button>
          <button type="button" className={`chip${S.start >= 360 ? ' on' : ''}`} aria-pressed={S.start >= 360} onClick={() => engine.setStart(MORNING_START)}>{t('picker.morning')}</button>
        </div>
      )}
    </>
  )
}
