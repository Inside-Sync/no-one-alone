import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Glyph, Icon } from '@/components/ui/Icon'
import { BASE_SECS, samples, sentenceTxt, tx, type SampleKey, type SpeechResult } from '../../../engine'
import { ProvTag, useG } from '../../app/Provenance'
import { langAttrs } from '../langText'
import type { KindProps } from '../types'
import { useSpeech } from './useSpeech'

interface Props extends Pick<KindProps, 'engine' | 'snap' | 'r'> {
  /** `home` (step 0) or `daily`: where the result is stored. */
  which: 'home' | 'daily'
  /** The sample answers offered, in order. */
  sample: SampleKey[]
  /** What Noa Voice says before the sentence. */
  ask: string
  /** The block's title: "speech check (play Moza)". */
  title: string
}

const LEVEL_CLASS = { green: 'st-green', amber: 'st-amber', red: 'st-red' } as const

/** The usual speech score written in the person's description ("... · speech score 0.94"), as a number; null when there is none. */
export function usualScore(text: string): number | null {
  const plain = text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/٫/g, '.')
  const all = plain.match(/\d+\.\d+/g)
  const v = all ? Number(all[all.length - 1]) : NaN
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : null
}

/** Plan item G3: today's score beside the person's own usual score, the difference, and one plain line. No threshold: it only compares. */
export function UsualCompare({ today, usual, who }: { today: number; usual: number; who: string }) {
  const t = useG()
  const diff = Math.round((today - usual) * 100) / 100
  const dir = diff < 0 ? 'lower' : diff > 0 ? 'higher' : 'same'
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  return (
    <div className="tc-usual" role="group" aria-label={t('usual.label')}>
      <dl dir="ltr">
        <div><dt>{t('usual.today')}</dt><dd>{today.toFixed(2)}</dd></div>
        <div><dt>{t('usual.usual')}</dt><dd>{usual.toFixed(2)}</dd></div>
        <div><dt>{t('usual.diff')}</dt><dd className={`d-${dir}`}>{sign}{Math.abs(diff).toFixed(2)}</dd></div>
      </dl>
      <p>{t(`usual.${dir}`, { n: who, diff: Math.abs(diff).toFixed(2), usual: usual.toFixed(2) })}</p>
    </div>
  )
}

/** The score block: level, words heard clearly (green) or missed (struck through), time, words per minute. */
export function SpeechResultView({ res, usual, who }: { res: SpeechResult; usual?: number | null; who?: string }) {
  const { t, i18n } = useTranslation('tcSafety')
  const la = langAttrs(res.lang)
  return (
    <div className={`result status ${LEVEL_CLASS[res.lvl]}`}>
      <b>{res.said ? `${t(`speech.level.${res.lvl}`)} · ${res.score.toFixed(2)}` : t('speech.level.none')}</b>{res.said && <> <ProvTag kind="calculated" /></>}
      {res.said && usual != null && <UsualCompare today={res.score} usual={usual} who={who ?? ''} />}
      {res.said && (
        <>
          <ul className="sp-words" {...la}>
            {res.target.map((w, i) => (
              <li key={i} className={res.mask[i] ? 'ok' : 'miss'} title={t(res.mask[i] ? 'speech.wordHeard' : 'speech.wordMissed')}>{w}</li>
            ))}
          </ul>
          <div className="nums">
            <span>{t('speech.clear', { m: res.matched, t: res.total })}</span>
            <span>{res.secs ? t('speech.time', { s: res.secs.toFixed(1), base: BASE_SECS.toFixed(1) }) : t('speech.typedNoTiming')}</span>
            {res.wpm ? <span>{t('speech.wpm', { n: res.wpm })}</span> : null}
            <span>{t(`speech.mode.${res.mode}`)}</span>
          </div>
          <div className="src" {...la}>{i18n.getFixedT(res.lang, 'tcSafety')('speech.heard', { said: res.said })}</div>
        </>
      )}
    </div>
  )
}

/**
 * The speech check: Noa Voice asks for a sentence; the person says it (browser speech recognition), types it, or uses a
 * ready-made sample. Scoring and the decision belong to the engine.
 */
export function SpeechCheck({ engine, snap, r, which, sample, ask, title }: Props) {
  const { t } = useTranslation('tcSafety')
  const person = engine.person
  const usual = person.t.usual ? usualScore(r(tx(person.t.usual))) : null
  const who = person.t.n ? r(tx(person.t.n)) : ''
  const S = snap.state
  const lang = S.lang
  const rtlAttrs = langAttrs(lang)
  const res = S.speech[which]
  const locked = which === 'home' && S.phase === 'decided'
  const [typed, setTyped] = useState('')
  const sp = useSpeech(lang, (text, secs) => engine.spokenSpeech(text, secs))
  const sm = samples(engine.t, S.pk)

  const submitTyped = (e: FormEvent) => {
    e.preventDefault()
    if (!typed.trim() || locked) return
    engine.typedSpeech(typed)
    setTyped('')
  }
  const msg = sp.problem ? t(`speech.${sp.problem}`) : null

  return (
    <div className="yourturn mode-ind speechcheck">
      <span className="lab">{t('yourTurn', { what: title })}</span>
      <p>{ask}</p>
      <p className="sr-sentence-label" id={`sp-${which}-l`}>{t('speech.sentence')}</p>
      <div className="sentence" aria-labelledby={`sp-${which}-l`} {...rtlAttrs}>{r(sentenceTxt(lang, S.pk))}</div>
      {sp.canListen ? (
        sp.state === 'idle' ? (
          <div className="btnrow">
            <button type="button" className="btn" disabled={locked} onClick={sp.start}><Glyph name="mic" />{t('speech.say')}</button>
          </div>
        ) : (
          <div className="btnrow">
            <button type="button" className="btn rec" onClick={sp.stop}>{<span className="ic" aria-hidden="true"><Icon name="stop" /></span>} {t('speech.done')}</button>
            <span className="live" role="status" aria-live="polite">{sp.state === 'starting' ? t('speech.starting') : sp.heard || t('speech.listening')}</span>
          </div>
        )
      ) : (
        <p className="note">{t('speech.noMic')}</p>
      )}
      {msg && <p className="note warn" role="status">{msg}</p>}
      <form className="typed" onSubmit={submitTyped}>
        <input
          value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t('speech.placeholder')} aria-label={t('speech.typedLabel')}
          disabled={locked} {...rtlAttrs}
        />
        <button type="submit" className="btn ghost sm" disabled={locked || !typed.trim()}>{t('speech.check')}</button>
      </form>
      <div className="btnrow">
        {sample.map((k) => (
          <button key={k} type="button" className="btn ghost sm" disabled={locked} onClick={() => engine.sampleSpeech(k)}>{r(sm[k].label)}</button>
        ))}
      </div>
      {res && <SpeechResultView res={res} usual={usual} who={who} />}
      <p className="note">{t('speech.demo')}</p>
    </div>
  )
}
