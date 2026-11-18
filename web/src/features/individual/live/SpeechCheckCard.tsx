'use client'

import { useTranslation } from 'react-i18next'
import { NoaOrb } from '@/components/noa/NoaOrb'
import { GlassCard } from '@/components/ui/GlassCard'
import { Glyph, Icon, type IconName } from '@/components/ui/Icon'
import type { Assessment, IncidentDoc, TurnDoc } from '@/data/contract'
import { isSpeechCheckTurn } from '@/domain/agent'
import { clockTime } from '@/domain/incident'
import { rng } from '@/lib/rng'


type Kind = 'base' | 'clear' | 'slurred'
type State = 'ready' | 'listen' | 'analyse' | 'clear' | 'slurred'

/** The speech check question, its time and the verdict on the reply (asked again or not), from the check-in turns. */
function speechState(turns: readonly TurnDoc[], busy: boolean): { state: State; at: string | null; azure: Assessment['pronunciation'] } {
  let at: string | null = null
  let state: State = 'ready'
  let azure: Assessment['pronunciation']
  for (const turn of turns) {
    if (turn.by === 'AGENT') {
      if (isSpeechCheckTurn(turn)) { at = turn.at; state = 'listen' }
      else if (state === 'listen') state = 'ready'
      continue
    }
    const clarity = turn.assessment?.clarity
    if (state === 'listen' && clarity) { state = clarity === 'CLEAR' ? 'clear' : 'slurred'; azure = turn.assessment?.pronunciation }
  }
  if (state === 'listen' && busy) state = 'analyse'
  return { state, at, azure }
}

/** Deterministic bars per word (prototype `spkWave`): slurred speech is slower, quieter and gappier. */
function wave(kind: Kind, dim: boolean, words: readonly string[]) {
  const r = rng(kind === 'base' ? 11 : kind === 'clear' ? 23 : 37)
  const H = 56, mid = 34
  const col = kind === 'base' ? 'var(--spk-base)' : kind === 'clear' ? 'var(--good)' : 'var(--bad)'
  const bars: { x: number; h: number }[] = []
  const labels: { x: number; w: string }[] = []
  let x = 8
  words.forEach((w, i) => {
    const n = kind === 'slurred' ? Math.round(w.length * 2.6 + 4) : Math.round(w.length * 1.6 + 3)
    const gap = kind === 'slurred' ? (i === 2 || i === 4 ? 26 : 16) : 7
    const x0 = x
    for (let j = 0; j < n; j++) {
      const env = Math.sin((Math.PI * (j + 0.5)) / n)
      const a = kind === 'slurred' ? (0.25 + r() * 0.35) * env * 0.8 + 0.08 : (0.35 + r() * 0.65) * env + 0.06
      bars.push({ x, h: Math.max(2, a * H) })
      x += 4.4
    }
    labels.push({ x: (x0 + x) / 2, w })
    x += gap
  })
  const svg = (W: number, scan: boolean) => (
    <svg viewBox={`0 0 ${W} 106`} preserveAspectRatio="xMinYMid meet" className={scan ? 'scan' : undefined} aria-hidden="true">
      {bars.map((b, k) => <rect key={k} x={b.x.toFixed(1)} y={(mid - b.h / 2).toFixed(1)} width="3" height={b.h.toFixed(1)} rx="1.5" fill={col} opacity={dim ? 0.35 : 1} />)}
      {labels.map((l) => <text key={l.w} x={l.x.toFixed(1)} y={mid + H / 2 + 16} textAnchor="middle">{l.w}</text>)}
    </svg>
  )
  return { svg, w: x }
}

/** The bar fractions of the five measures (her normal, tonight clear, tonight slurred); their texts are `live:speech.metricValues` (the demo's illustrative numbers). */
const FRACTIONS: [n: number, c: number, s: number][] = [
  [0.94, 0.93, 0.41],
  [152 / 160, 148 / 160, 74 / 160],
  [0.22, 0.25, 0.9],
  [1, 1, 1 / 3],
  [0.9, 0.88, 0.35],
]

const HOW_ICONS: IconName[] = ['headphones', 'message-circle', 'chart-column', 'dot-red']
/** The verdict states whose text had an icon before it. */
const STATE_ICON: Partial<Record<State, IconName>> = { listen: 'mic', slurred: 'triangle-alert' }

/** Noa Speech Check (c12, prototype part 10): her own voice against tonight's sentence, five measures and the verdict. */
export function SpeechCheckCard({ incident, name, timeZone, onReplay, busy = false }: {
  incident: IncidentDoc | null
  name: string
  timeZone: string
  /** Runs the night demo again so another answer can be tried. */
  onReplay?: () => void
  busy?: boolean
}) {
  const { t } = useTranslation('live')
  const { state, at, azure } = speechState(incident?.checkIn?.turns ?? [], incident?.checkIn?.busy ?? false)
  const heard = state === 'clear' || state === 'slurred' || state === 'analyse'
  const words = t('speech.words').split(' ')
  const values = t('speech.metricValues', { returnObjects: true }) as [string, string, string][]
  const base = wave('base', false, words)
  const now = heard ? wave(state === 'slurred' ? 'slurred' : 'clear', false, words) : null
  const W = Math.max(base.w, now?.w ?? 0) + 8
  const show = state === 'clear' || state === 'slurred'
  const pill = { ready: 'plain', listen: 'warn', analyse: 'warn', clear: 'good', slurred: 'bad' }[state]
  const labels = t('speech.measures', { returnObjects: true }) as string[]
  return (
    <GlassCard span={12} id="spkCard" className="spk">
      <div className="ch">
        <h2><NoaOrb size={22} /> {t('speech.title')}</h2>
        <span className="tag spk-tag">{t('speech.tag')}</span>
        <span className="meta">{t('speech.meta', { name })}</span>
        {/* Once there is a verdict it gets the banner below instead of the pill. */}
        {!show && <span className={`pill ${pill}`} id="spkVerdict">{STATE_ICON[state] && <Glyph name={STATE_ICON[state]} />}{t(`speech.state.${state}`, { name })}</span>}
      </div>
      {show && (
        <div className={`spk-verdict ${state}`} role="status">
          <b className="spk-pass"><Glyph name={state === 'clear' ? 'check' : 'x'} />{t(state === 'clear' ? 'speech.pass' : 'speech.fail')}</b>
          <span className="spk-num">{t('speech.clarity', { x: state === 'clear' ? values[0][1] : values[0][2], normal: values[0][0] })}</span>
          {azure && <small className="spk-azure">{t('speech.azure', { overall: Math.round(azure.overall), fluency: Math.round(azure.fluency) })}</small>}
          {onReplay && <button type="button" className="btn sm soft spk-replay" onClick={onReplay} disabled={busy}>{t('speech.replay')}</button>}
          <small>{STATE_ICON[state] && <Glyph name={STATE_ICON[state]} />}{t(`speech.state.${state}`, { name })}</small>
        </div>
      )}
      <div className="spk-grid">
        <div className="spk-waves">
          <div className="spk-row">
            <span className="spk-lbl">{t('speech.normal')}<small>{t('speech.baseline')}</small></span>
            {base.svg(W, false)}
          </div>
          <div className="spk-row">
            <span className="spk-lbl">{t('speech.tonight')}<small>{at ? clockTime(at, timeZone) : '—'}</small></span>
            {now ? now.svg(W, state === 'analyse') : (
              <div className="spk-wait">
                {state === 'listen'
                  ? <><div className="listen"><i></i><i></i><i></i><i></i><i></i></div>{t('speech.repeating', { name })}</>
                  : t('speech.idle', { name })}
              </div>
            )}
          </div>
        </div>
        <div className="spk-metrics">
          <table>
            <thead><tr><th>{t('speech.measure')}</th><th>{t('speech.normalCol')}</th><th>{t('speech.tonightCol')}</th></tr></thead>
            <tbody>
              {FRACTIONS.map((m, k) => {
                const slurred = state === 'slurred'
                const v = show ? (slurred ? values[k][2] : values[k][1]) : '—'
                const f = slurred ? m[2] : m[1]
                return (
                  <tr key={k}>
                    <td>{labels[k]}</td>
                    <td className="n">{values[k][0]}</td>
                    <td className={`n ${show ? (slurred ? 'bad' : 'good') : ''}`}>
                      {v}
                      {show && (
                        <span className="spk-dual" aria-hidden="true">
                          <i className="n" style={{ width: `${Math.min(100, (m[0] / Math.max(m[0], m[1], m[2])) * 100)}%` }}></i>
                          <i className="t" style={{ width: `${Math.min(100, (f / Math.max(m[0], m[1], m[2])) * 100)}%` }}></i>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ol className="spk-how">
        {(t('speech.how', { returnObjects: true }) as [string, string][]).map(([b, rest], k) => (
          <li key={k} className={k === HOW_ICONS.length - 1 ? 'red' : undefined}><b><span className="ic"><Icon name={HOW_ICONS[k]} tint /></span></b><span><strong>{b}</strong> {rest}</span></li>
        ))}
      </ol>
      <p className="fine">{t('speech.fine')}</p>
    </GlassCard>
  )
}
