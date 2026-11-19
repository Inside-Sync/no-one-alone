'use client'

import { Icon } from '@/components/ui/Icon'
import { CASES, CASE_GROUPS, SPEECH_CASE } from '../../data/cases'
import { PEOPLE, PERSON_IDS } from '../../data/people'
import { tx, type CaseId, type PersonId } from '../../engine'
import { useA, type SessionProps } from './parts'

const NIGHT_START = 72
const MORNING_START = 490

/**
 * The prototype's picker: "Who should Noa look after?" with three "Start with ..." cards (the family, the live speech test, the one-tap
 * screening). In the simple view the other seven wait behind a dashed "More cases" card; after it (or with details on) the prevention and safety-net groups show.
 */
export function CasePicker({ s }: SessionProps) {
  const t = useA()
  const { engine, snap, r } = s
  const S = snap.state
  const age = (id: PersonId) => (PEOPLE[id].child && PEOPLE[id].t.age ? r(tx(PEOPLE[id].t.age!)) : PEOPLE[id].age)
  // One card for every group. The start cards lead with the person (prototype "Start with ..."): who Noa looks after, then the age and
  // the case; the other groups lead with the case, then the person.
  const card = (id: CaseId, start: boolean) => {
    const c = CASES[id], speech = id === SPEECH_CASE, name = r(tx(PEOPLE[c.person].t.n!))
    const title = start ? t('picker.startWith', { who: id === 'family' ? t('picker.family') : name }) : r(tx(c.title))
    const sub = id === 'family' || id === 'own' ? r(tx(c.teaser))
      : start ? [age(c.person), r(tx(c.title)), speech ? t('picker.speech') : ''].filter(Boolean).join(' · ')
      : `${name}, ${age(c.person)} · ${r(tx(c.teaser))}`
    return (
      <button key={id} type="button" className={`cs${start ? ' tc-startcs' : ''}${speech ? ' speechcs' : ''}${S.ck === id ? ' on' : ''}`} aria-pressed={S.ck === id} onClick={() => s.pick(id)}>
        <span className="ci" aria-hidden="true"><span className="ic"><Icon name={speech ? 'mic' : c.icon} tint /></span></span>
        <span><b>{title}</b><small>{sub}</small></span>
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
          {start.cases.map((id) => card(id, true))}
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
          <div className="cases">{g.cases.map((id) => card(id, false))}</div>
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
