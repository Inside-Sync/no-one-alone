import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Glyph } from '@/components/ui/Icon'
import { DAILY, QUESTIONS } from '../../../data'
import { clk, hm, tx, type Lang, type SafetyInputs } from '../../../engine'
import { langAttrs, useSpeakResolve } from '../langText'
import type { ScreenProps } from '../types'
import { Signal } from '../Signal'

type Tone = 'red' | 'amber' | 'green' | 'info'

function Box({ tone, title, children, speak }: { tone: Tone; title: ReactNode; children?: ReactNode; speak?: Lang }) {
  return <div className={`status st-${tone}`} role="status" {...(speak ? langAttrs(speak) : {})}><b>{title}</b>{children}</div>
}

function Tile({ k, v, unit, cls }: { k: string; v: ReactNode; unit?: string; cls?: string }) {
  return <div className={`tile ${cls ?? ''}`}><div className="k">{k}</div><div className="v">{v}{unit ? <small>{unit}</small> : null}</div></div>
}

/** Screen 1: the person's phone (Individual mode). What it shows depends on the step and on what the engine decided. */
export function SafetyPhone({ engine, snap, r }: ScreenProps) {
  const { t } = useTranslation('tcSafety')
  const rl = useSpeakResolve(engine, snap)
  const S = snap.state, st = snap.step, I = S.inp as SafetyInputs, p = engine.person
  const nm = r(tx(p.t.n!)), sp = S.speech.home
  const night = engine.caseDef.night
  const spLvl = (l: 'green' | 'amber' | 'red') => t(`phone.speech.${l}`)
  let stat: ReactNode = null
  let tiles: ReactNode = null

  if (S.step === 0) {
    const last = S.read.length ? S.read[S.read.length - 1] : '—'
    const d = S.dec
    if (d) {
      if (d.path) {
        stat = /_em$/.test(d.path)
          ? <Box tone="red" title={t('phone.helpTitle')}>{t('phone.helpText')}<button type="button" className="sos" aria-disabled="true">{t('phone.sos')}</button></Box>
          : <Box tone="amber" title={t('phone.noa')}>{d.path === 'hypo_home' ? t('phone.drink') : d.path === 'fall_minor' ? t('phone.getUp') : t('phone.nurse')}</Box>
      } else stat = <Box tone="green" title={t('phone.noa')}>{t('phone.allWell')}</Box>
    } else if (S.phase === 'check') {
      stat = <Box tone="amber" title={<><Glyph name="speech" />{t('phone.voiceTitle')}</>}>{r(tx(QUESTIONS[S.qk ?? 'hr'].q))}</Box>
    } else {
      stat = <Box tone="info" title={night ? t('phone.night') : t('phone.morning')}>{t('phone.watching')}</Box>
    }
    const on = S.min >= 10
    tiles = (
      <>
        <Tile k={t('phone.tile.hr')} v={last} unit={t('units.bpm')} cls={typeof last === 'number' && last > 120 ? 'red' : ''} />
        {I.glu != null
          ? <Tile k={t('phone.tile.glucose')} v={on ? I.glu : '6.8'} unit={t('units.mmol')} cls={on && I.glu < 4 ? 'red' : ''} />
          : I.fall
            ? <Tile k={t('phone.tile.fall')} v={on ? t('phone.tile.detected') : '—'} cls={on ? 'red' : ''} />
            : <Tile k={t('phone.tile.weight')} v={on ? `${I.wt > 0 ? '+' : ''}${I.wt}` : '0'} unit={t('units.kg')} cls={on && I.wt >= 2 ? 'amber' : ''} />}
        <Tile k={t('phone.tile.oxygen')} v={I.spo2} unit={t('units.pct')} cls={I.spo2 <= 92 ? 'amber' : ''} />
        <Tile k={t('phone.tile.speech')} v={sp ? (sp.said ? spLvl(sp.lvl) : t('phone.speech.none')) : t('phone.speech.wait')} cls={sp?.lvl === 'red' ? 'red' : ''} />
      </>
    )
  } else if (st.kind === 'teach') {
    const e = engine.curExplain()
    stat = <Box tone="amber" speak={S.lang} title={<><Glyph name="graduation-cap" />{t('phone.coach')}</>}>{e ? rl(e.explain) : null}</Box>
  } else if (st.kind === 'daily') {
    const meta = engine.meta(), D = meta.daily ? DAILY[meta.daily] : null
    if (D) {
      stat = S.daily.sent
        ? S.daily.alert
          ? <Box tone="amber" title={t('phone.navigator')}>{t('phone.sentTo', { team: r(tx(D.team)) })}</Box>
          : <Box tone="green" title={t('phone.noa')}>{t('phone.onTargetToday')}</Box>
        : <Box tone="info" title={t('phone.goodMorning', { n: nm })}>{t('phone.checkin')}</Box>
      tiles = (
        <>
          <Tile k={r(tx(D.label)).split(/[,،]/)[0]} v={S.daily.val != null ? S.daily.val : D.def} unit={D.unit} cls={S.daily.sent && S.daily.alert ? 'amber' : ''} />
          <Tile k={t('phone.tile.hr')} v={72} unit={t('units.bpm')} />
          <Tile k={t('phone.tile.speech')} v={S.speech.daily ? spLvl(S.speech.daily.lvl) : t('phone.speech.due')} />
        </>
      )
    }
  } else if (st.kind === 'accept') {
    stat = S.done[S.step] ? <Box tone="green" title={t('phone.careTeam')}>{t('phone.changedPlan')}</Box> : <Box tone="info" title={t('phone.careTeam')}>{t('phone.hasReadings')}</Box>
  } else if (st.kind === 'report') {
    stat = <Box tone="green" title={t('phone.inCare')}>{t('phone.nextCheck')}</Box>
  } else if (st.phone) {
    stat = <Box tone={st.phone.tone} title={r(tx(st.phone.title))}>{st.phone.text ? r(tx(st.phone.text)) : null}</Box>
  }

  return (
    <>
      <div className="ph-notch" />
      <div className="ph-bar"><span>{hm(S.clock)}</span><span>{t('phone.bar')} <Signal /></span></div>
      <div className="ph-body">
        <div className="ph-hello">
          <h3>{S.step === 0 && night ? nm : t('phone.hello', { n: nm })}</h3>
          <span className="is-tag mtag-ind">{r(tx('modes.ind'))}</span>
        </div>
        {stat}
        {tiles && <div className="tiles">{tiles}</div>}
        <div className="pend"><span>{clk(S.clock)}</span><span>{r(tx(p.t.call!))}</span></div>
      </div>
    </>
  )
}

/** Screen 2: the family's web app (Individual mode): updates from Noa and who can see the person's data. */
export function SafetyWeb({ engine, snap, r }: ScreenProps) {
  const { t } = useTranslation('tcSafety')
  const S = snap.state, p = engine.person
  const nm = r(tx(p.t.n!))
  const feed = S.feed.slice().reverse().slice(0, 5)
  return (
    <>
      <div className="win-bar mode-ind"><i /><i /><i /><span className="t">{t('web.brand')} · <span className="mt">{r(tx('modes.ind'))}</span> · {t('web.family', { n: nm })}</span></div>
      <div className="win-body" tabIndex={0}>
        <div>
          <div className="lab" style={{ marginBottom: 6 }}>{t('web.circle')}</div>
          <div className="explain" aria-live="polite">
            {feed.length
              ? feed.map((f, i) => (
                <div className="fnd" key={i}><div className="h">{r(f.who)}</div><div>{r(f.text)}</div><div className="meta">{f.t}</div></div>
              ))
              : <div className="empty">{t('web.empty', { f1: r(tx(p.t.f1s!)), f2: r(tx(p.t.f2s!)) })}</div>}
          </div>
        </div>
        <div>
          <div className="lab" style={{ marginBottom: 6 }}>{t('web.who', { n: nm })}</div>
          <div className="explain">
            {snap.db.consents.map((c, i) => (
              <div className="fnd" key={i}>
                <div className="h">{t(`web.scope.${String(c.scope) as 'emergencies'}`, { defaultValue: String(c.scope).replace('_', ' ') })}</div>
                <div className="meta">{r(c.shared_with)} · <b>{r(c.status)}</b></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
