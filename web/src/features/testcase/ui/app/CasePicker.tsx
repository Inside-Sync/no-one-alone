'use client'

import { Icon } from '@/components/ui/Icon'
import { CASES, CASE_GROUPS, SPEECH_CASE } from '../../data/cases'
import { PEOPLE, PERSON_IDS } from '../../data/people'
import { tx, type CaseId, type PersonId } from '../../engine'
import { useA, type SessionProps } from './parts'

const NIGHT_START = 72
const MORNING_START = 490

/**
 * The prototype's picker: "Start here · pick one" with three cards (the family, the live speech test, the one-tap screening). In the simple
 * view the other seven wait behind a dashed "More cases" card; after it (or with details on) the prevention and safety-net groups show.
 */
export function CasePicker({ s }: SessionProps) {
  const t = useA()
  const { engine, snap, r } = s
  const S = snap.state
  const age = (id: PersonId) => (PEOPLE[id].child && PEOPLE[id].t.age ? r(tx(PEOPLE[id].t.age!)) : PEOPLE[id].age)
  const card = (id: CaseId) => {
    const c = CASES[id], p = PEOPLE[c.person]
    const sub = id === 'own' || id === 'family' ? r(tx(c.teaser)) : `${r(tx(p.t.n!))}, ${age(c.person)} · ${r(tx(c.teaser))}`
    const speech = id === SPEECH_CASE
    return (
      <button key={id} type="button" className={`cs${speech ? ' speechcs' : ''}${S.ck === id ? ' on' : ''}`} aria-pressed={S.ck === id} onClick={() => s.pick(id)}>
        <span className="ci" aria-hidden="true"><span className="ic"><Icon name={speech ? 'mic' : c.icon} tint /></span></span>
        <span><b>{speech ? t('picker.speech') : r(tx(c.title))}</b><small>{sub}</small></span>
      </button>
    )
  }
  const [start, ...rest] = CASE_GROUPS
  const more = s.details || s.more || !start.cases.includes(S.ck)
  const hidden = rest.flatMap((g) => g.cases)
  return (
    <>
      <div className="tc-group">
        <span className="lab">{t('picker.group.start')}</span>
        <div className="cases">
          {start.cases.map(card)}
          {!more && (
            <button type="button" className="cs morecs" aria-expanded={false} onClick={() => { s.showMore(); window.setTimeout(() => document.querySelector<HTMLElement>('#picker .tc-group + .tc-group .cs')?.focus(), 0) }}>
              <span className="ci" aria-hidden="true"><span className="ic"><Icon name="plus" tint /></span></span>
              <span><b>{t('picker.more', { n: hidden.length })}</b><small>{hidden.map((id) => r(tx(CASES[id].title))).join(', ')}</small></span>
            </button>
          )}
        </div>
      </div>
      {more && rest.map((g) => (
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
