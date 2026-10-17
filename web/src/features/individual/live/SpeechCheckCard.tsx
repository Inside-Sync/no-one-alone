'use client'

import { useTranslation } from 'react-i18next'
import { NoaOrb } from '@/components/noa/NoaOrb'
import { GlassCard } from '@/components/ui/GlassCard'
import type { IncidentDoc, TurnDoc } from '@/data/contract'
import { clockTime } from '@/domain/incident'
import { rng } from '@/lib/rng'

const SPEECH_CHECK = /sky is blue in sydney|trời sydney hôm nay xanh/i
const WORDS = ['The', 'sky', 'is', 'blue', 'in', 'Sydney']

type Kind = 'base' | 'clear' | 'slurred'
type State = 'ready' | 'listen' | 'analyse' | 'clear' | 'slurred'

/** The speech check question, its time and the verdict on the reply (asked again or not), from the check-in turns. */
function speechState(turns: readonly TurnDoc[], busy: boolean): { state: State; at: string | null } {
  let at: string | null = null
  let state: State = 'ready'
  for (const turn of turns) {
    if (turn.by === 'AGENT') {
      if (SPEECH_CHECK.test(turn.text)) { at = turn.at; state = 'listen' }
      else if (state === 'listen') state = 'ready'
      continue
    }
    const clarity = turn.assessment?.clarity
    if (state === 'listen' && clarity) state = clarity === 'CLEAR' ? 'clear' : 'slurred'
  }
  if (state === 'listen' && busy) state = 'analyse'
  return { state, at }
}

/** Deterministic bars per word (prototype `spkWave`): slurred speech is slower, quieter and gappier. */
function wave(kind: Kind, dim: boolean) {
  const r = rng(kind === 'base' ? 11 : kind === 'clear' ? 23 : 37)
  const H = 56, mid = 34
  const col = kind === 'base' ? 'var(--spk-base)' : kind === 'clear' ? 'var(--good)' : 'var(--bad)'
  const bars: { x: number; h: number }[] = []
  const labels: { x: number; w: string }[] = []
  let x = 8
  WORDS.forEach((w, i) => {
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

/** Her normal, tonight clear, tonight slurred, and the bar fractions for each (the demo's illustrative numbers). */
const METRICS: [normal: string, clear: string, slurred: string, n: number, c: number, s: number][] = [
  ['0.94', '0.93', '0.41', 0.94, 0.93, 0.41],
  ['152 wpm', '148 wpm', '74 wpm', 152 / 160, 148 / 160, 74 / 160],
  ['0.22 s', '0.25 s', '0.90 s', 0.22, 0.25, 0.9],
  ['6 of 6', '6 of 6', '2 of 6', 1, 1, 1 / 3],
  ['steady', 'steady', 'shaky', 0.9, 0.88, 0.35],
]

/** Noa Speech Check (c12, prototype part 10): her own voice against tonight's sentence, five measures and the verdict. */
export function SpeechCheckCard({ incident, name, timeZone }: { incident: IncidentDoc | null; name: string; timeZone: string }) {
  const { t } = useTranslation('live')
  const { state, at } = speechState(incident?.checkIn?.turns ?? [], incident?.checkIn?.busy ?? false)
  const heard = state === 'clear' || state === 'slurred' || state === 'analyse'
  const base = wave('base', false)
  const now = heard ? wave(state === 'slurred' ? 'slurred' : 'clear', false) : null
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
        <span className={`pill ${pill}`} id="spkVerdict">{t(`speech.state.${state}`, { name })}</span>
      </div>
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
              {METRICS.map((m, k) => {
                const slurred = state === 'slurred'
                const v = show ? (slurred ? m[2] : m[1]) : '—'
                const f = slurred ? m[5] : m[4]
                return (
                  <tr key={k}>
                    <td>{labels[k]}</td>
                    <td className="n">{m[0]}</td>
                    <td className={`n ${show ? (slurred ? 'bad' : 'good') : ''}`}>
                      {v}{show && <i className="spk-bar"><b style={{ width: `${Math.min(100, (f / Math.max(m[3], m[4], m[5])) * 100)}%` }}></b></i>}
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
          <li key={k}><b>{k + 1}</b><span><strong>{b}</strong> {rest}</span></li>
        ))}
      </ol>
      <p className="fine">{t('speech.fine')}</p>
    </GlassCard>
  )
}
