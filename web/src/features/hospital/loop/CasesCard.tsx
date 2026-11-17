import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/ui/GlassCard'
import { Icon } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { TableScroll } from '@/components/ui/TableScroll'
import { useToast } from '@/components/ui/Toast'
import type { LoopFeedItem, LoopCase } from '@/data/types'

const plain = { fontWeight: 500 } as const
const hidden = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } as const
const pad = (n: number) => (n < 10 ? '0' : '') + n

interface Props {
  cases: LoopCase[]
  /** Seconds since the page opened. */
  elapsed: number
  done: ReadonlySet<string>
  /** A case's action was taken; `entry` is the line it adds to the feed. */
  onAct: (c: LoopCase, entry: LoopFeedItem) => void
}

/** `Needs a person now` (c8): the cases Noa cannot move on, sorted by deadline, one action each. */
export function CasesCard({ cases, elapsed, done, onAct }: Props) {
  const { t } = useTranslation('screening')
  const toast = useToast()
  const head = t('loop.cases.head', { returnObjects: true }) as string[]

  const left = (c: LoopCase) => c.due - elapsed
  /** `1d 2h`, `5h 10m`, `42m 00s`, with "in ..." or "... late" around it. */
  const dueText = (sec: number) => {
    const late = sec < 0
    const a = Math.abs(sec)
    const d = Math.floor(a / 86400), h = Math.floor((a % 86400) / 3600), m = Math.floor((a % 3600) / 60), s = Math.floor(a % 60)
    const span = d ? t('loop.due.dh', { d, h }) : h ? t('loop.due.hm', { h, m: pad(m) }) : t('loop.due.ms', { m, s: pad(s) })
    return t(late ? 'loop.due.late' : 'loop.due.in', { t: span })
  }

  return (
    <GlassCard span={8}>
      <div className="ch">
        <span className="li"><span className="ic"><Icon name="target" /></span></span>
        <h2>{t('loop.cases.title')}</h2>
        <span className="meta">{t('loop.cases.meta')}</span>
      </div>
      <TableScroll>
        <table>
          <thead>
            <tr>
              {head.map((h) => <th key={h}>{h}</th>)}
              <th><span style={hidden}>{t('loop.cases.actionHead')}</span></th>
            </tr>
          </thead>
          <tbody id="loopRows">
            {cases.slice().sort((a, b) => left(a) - left(b)).map((c) => {
              const isDone = done.has(c.id)
              const l = left(c)
              return (
                <tr key={c.id} className={isDone ? 'done' : ''}>
                  <td><b style={plain}>{c.name}</b><small>{t('loop.caseMeta', { age: c.age, code: c.code })}</small></td>
                  <td>{c.result}</td>
                  <td><Pill tone={c.stepTone}>{c.step}</Pill></td>
                  <td style={{ fontSize: 12.5 }}>{c.why}</td>
                  <td><span className={`due ${isDone ? '' : l < 0 ? 'over' : l < 3600 ? 'soon' : ''}`}>{isDone ? t('loop.cases.dueDone') : dueText(l)}</span></td>
                  <td>
                    {isDone
                      ? <Pill tone="good">{t('loop.cases.done')}</Pill>
                      : (
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => {
                            toast(c.done)
                            onAct(c, { src: t('loop.feed.you'), text: t('loop.feed.yourAction', { action: c.action, name: c.name }) })
                          }}
                        >
                          {c.action}
                        </button>
                      )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
      <p className="fine">{t('loop.cases.fine')}</p>
    </GlassCard>
  )
}
