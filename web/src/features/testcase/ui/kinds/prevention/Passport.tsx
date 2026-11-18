'use client'

import { BARRIERS, ENABLER, PV } from '../../../data/prevention'
import { CASES } from '../../../data/cases'
import { PREV_RANGES } from '../../../data/forecast'
import { tx, type PrevInputs, type PvId } from '../../../engine'
import { FieldGuard } from '../../app/FieldGuard'
import { ProvTag, useG } from '../../app/Provenance'
import type { KindProps } from '../types'
import { Moment } from './moment'
import { Checks, Range, RulesTable, Seg, StatusBox, YourTurn, tok, useP } from './parts'

/** Step 0 of the prevention cases (kinds `passport`, layouts `child` and `adult`): enter the details, let Noa check, answer the barrier question. */
export function PassportCard({ engine, snap, r }: KindProps) {
  const t = useP()
  const tg = useG()
  const S = snap.state
  const I = S.inp as PrevInputs
  const pv = PV[CASES[S.ck].pv as PvId]
  const child = pv.kind === 'child'
  const lock = S.phase !== 'setup'
  const blocked = snap.inputIssues.required.length > 0
  const ageR = child ? PREV_RANGES.ageChild : PREV_RANGES.ageAdult
  const guard = (f: 'age' | 'overdue' | 'rem', label: string, value: number, rg: { min: number; max: number; step: number }) => (
    <FieldGuard snap={snap} r={r} subject="prevention" field={f} label={label} value={value} min={rg.min} max={rg.max} step={rg.step} disabled={lock} onSet={(raw) => engine.setInput(f, raw)} />
  )
  const n = tok(engine, r, 'n')
  const dec = S.dec
  const rows: { name: string; what: string; state: string; cls: string }[] = [
    {
      name: t(child ? 'passport.selfChild' : 'passport.selfAdult', { n, age: I.age }),
      what: S.due ? r(S.due.item) : lock ? t('passport.dash') : t('passport.pressCheck'),
      state: I.overdue ? t('passport.overdueN', { n: I.overdue }) : t('passport.dueNow'),
      cls: 'due',
    },
    ...pv.family.map((f) => ({ name: r(tx(f.name)), what: r(tx(f.what)), state: r(tx(f.state)), cls: f.cls })),
  ]
  const askBarrier = S.phase === 'ask' || (S.phase === 'decided' && !!S.barrier)
  const checks = engine.checks()
  const booked = S.path === 'prev' && S.barrier ? tok(engine, r, 'slot') : null
  // Plan item Y1: Khalid's moment, one tap (check the passport, then pick the personal reason, P6).
  return (
    <>
      <p>{t('passport.intro')}</p>
      {S.ck === 'ifhas' && (
        <Moment slot={r(tx(pv.slot.value))} booked={booked} note={S.phase === 'decided' && !S.barrier && dec?.rule === 'P2' ? t('moment.withNoa.ineligible') : null} onBook={() => engine.oneTapBook()} />
      )}
      <YourTurn mode="ind" what={t('passport.enter')}>
        <div className="met">
          {child
            ? <Range id="tcp-age" label={t('passport.age')} value={I.age} min={0} max={84} step={1} unit={t('passport.months')} disabled={lock} onChange={(v) => engine.setInput('age', v)} />
            : <Range id="tcp-age" label={t('passport.age')} value={I.age} min={16} max={85} step={1} unit={t('passport.years')} disabled={lock} onChange={(v) => engine.setInput('age', v)} />}
          {guard('age', t('passport.age'), I.age, ageR)}
          <Range id="tcp-overdue" label={t('passport.overdue')} value={I.overdue} min={0} max={26} step={1} unit={t('passport.weeks')} disabled={lock} onChange={(v) => engine.setInput('overdue', v)} />
          {guard('overdue', t('passport.overdue'), I.overdue, PREV_RANGES.overdue)}
          <Range id="tcp-rem" label={t('passport.rem')} value={I.rem} min={0} max={6} step={1} disabled={lock} onChange={(v) => engine.setInput('rem', v)} />
          {guard('rem', t('passport.rem'), I.rem, PREV_RANGES.rem)}
        </div>
        {!child && (
          <div>
            <span className="lab" id="tcp-nat-l">{t('passport.nationality')}</span>
            <Seg
              labelledBy="tcp-nat-l"
              value={I.nat}
              disabled={lock}
              options={[['Emirati', t('passport.emirati')], ['Expatriate', t('passport.expatriate')]]}
              onChange={(v) => engine.setNationality(v as PrevInputs['nat'])}
            />
          </div>
        )}
        <div className="pass">
          <span className="lab">{t('passport.label')} <ProvTag kind="observed" /></span>
          {rows.map((row, i) => (
            <div key={i} className={`prow ${row.cls}`}><b>{row.name}</b><span>{row.what}</span><em>{row.state}</em></div>
          ))}
        </div>
        {S.phase === 'setup'
          ? <><button type="button" className="btn" disabled={blocked} aria-describedby={blocked ? 'tc-blocked' : undefined} onClick={() => engine.checkPassport()}>{t('passport.check')}</button>{blocked && <p id="tc-blocked" className="tc-issue is-required"><b>{tg('issue.required')}</b> {tg('issue.blocked')}</p>}</>
          : <button type="button" className="btn ghost sm" onClick={() => engine.replay()}>{t('passport.replay')}</button>}
      </YourTurn>
      {askBarrier && S.due && !S.noaPicked && (
        <YourTurn mode="ind" what={t('passport.answerAs', { n: tok(engine, r, 'addr') })}>
          <p>{I.overdue
            ? t('passport.askOverdue', { addr: tok(engine, r, 'addr'), poss: tok(engine, r, 'poss'), item: r(S.due.item), n: I.overdue })
            : t('passport.askDue', { addr: tok(engine, r, 'addr'), poss: tok(engine, r, 'poss'), item: r(S.due.item) })}</p>
          <div role="group" aria-label={t('passport.barriers')} className="tcp-barriers">
            {BARRIERS.map((b) => (
              <button key={b.id} type="button" className={`opt${S.barrier === b.id ? ' right' : ''}`} aria-pressed={S.barrier === b.id} disabled={S.phase === 'decided'} onClick={() => engine.chooseBarrier(b.id)}>
                {r(tx(b.label))}
                <span className="tcp-en">{t('passport.enabler', { rule: ENABLER[b.id].rule, name: r(tx(ENABLER[b.id].name)) })}</span>
              </button>
            ))}
          </div>
          <p className="note">{t('passport.notEligible')}</p>
        </YourTurn>
      )}
      {dec && (
        <div className="decision">
          <StatusBox tone={dec.rule === 'P2' || dec.rule === 'P8' ? 'green' : 'amber'} title={<>{t('passport.decision', { rule: dec.rule, name: r(dec.name) })} <ProvTag kind="calculated" /></>}>
            {dec.why ? r(dec.why) : t('passport.voiceLine', { voice: tok(engine, r, 'voice') })}
          </StatusBox>
          <Checks items={checks} r={r} />
          {!dec.path && <p className="note">{t('passport.tryAnother')}</p>}
        </div>
      )}
      <RulesTable hit={dec?.rule} r={r} open={!!dec} />
    </>
  )
}
