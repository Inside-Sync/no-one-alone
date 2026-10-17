'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NoaOrb } from '@/components/noa/NoaOrb'
import { GlassCard } from '@/components/ui/GlassCard'
import type { IncidentDoc } from '@/data/contract'
import { clockTime, memberName, type LivePeople } from '@/domain/incident'
import type { CallLine } from './useCallDialogue'

/** One thing said: by Noa (`agent`) to a channel, or by the person on that channel. */
interface Said { at: number; ch: string; agent: boolean; who: string; text: string }

const RELATION_ICON: Record<string, string> = { son: '👨', daughter: '👩', brother: '👴', sister: '👵', neighbour: '🏠', neighbor: '🏠' }
const first = (s: string) => s.split(' ')[0]
const quote = (s: string) => (/^["“(]/.test(s) ? s : `“${s}”`)

/** Every conversation of the incident in time order: Margaret's check-in, the calls to her circle, 000 and the hospital. */
function conversation(inc: IncidentDoc, people: LivePeople, call: CallLine[], t: (k: string, o?: object) => string): Said[] {
  const out: Said[] = []
  const her = first(people.person?.displayName ?? t('agent.her'))
  const ms = (iso: string) => Date.parse(iso)
  for (const turn of inc.checkIn?.turns ?? []) {
    if (!turn.text.trim()) continue
    out.push({ at: ms(turn.at), ch: 'mg', agent: turn.by === 'AGENT', who: her, text: quote(turn.text) })
  }
  const idByName = (name: string) => Object.keys(people.members).find((id) => people.members[id].displayName === name) ?? null
  for (const e of inc.timeline) {
    if (e.kind === 'NO_REPLY') out.push({ at: ms(e.at), ch: 'mg', agent: false, who: her, text: t('talk.noReply') })
    if (e.kind === 'NOTIFIED' && e.text.startsWith('Calling ')) {
      const colon = e.text.indexOf(': ')
      const id = idByName(e.text.slice('Calling '.length, colon < 0 ? undefined : colon))
      if (id && colon >= 0) out.push({ at: ms(e.at), ch: id, agent: true, who: first(memberName(people, id)), text: quote(e.text.slice(colon + 2)) })
    }
    if ((e.kind === 'ACCEPTED' || e.kind === 'DECLINED' || e.kind === 'ARRIVED') && people.members[e.actor]) {
      out.push({ at: ms(e.at), ch: e.actor, agent: false, who: first(memberName(people, e.actor)), text: t(`talk.${e.kind}`) })
    }
    if (e.kind === 'HANDOFF_SENT') {
      out.push({ at: ms(e.at), ch: 'hosp', agent: true, who: t('talk.hospital'), text: inc.handoff?.packet?.text?.trim() || e.text })
    }
    if (e.kind === 'HANDOFF_RECEIVED') out.push({ at: ms(e.at), ch: 'hosp', agent: false, who: t('talk.strokeTeam'), text: quote(e.text) })
  }
  const called = inc.timeline.find((e) => e.kind === 'CALLED_115')
  if (called) {
    call.forEach((l, i) => out.push({ at: ms(called.at) + i, ch: 'ooo', agent: l.by === 'noa', who: t('talk.operator'), text: quote(l.text) }))
  }
  return out.sort((a, b) => a.at - b.at)
}

/** `Live conversations` (c7): everything Noa says, and to whom, filterable by person. */
export function ConversationsCard({ incident, people, call, dialling }: {
  incident: IncidentDoc | null; people: LivePeople; call: CallLine[]; dialling: boolean
}) {
  const { t } = useTranslation('live')
  const [filter, setFilter] = useState('all')
  const tz = people.person?.timezone ?? 'Asia/Ho_Chi_Minh'
  const num = people.person?.emergencyNumber ?? '000'
  const all = incident ? conversation(incident, people, call, t as unknown as (k: string, o?: object) => string) : []
  const channel = (ch: string): [icon: string, name: string] => {
    if (ch === 'mg') return ['👵', first(people.person?.displayName ?? t('agent.her'))]
    if (ch === 'ooo') return ['🚑', num]
    if (ch === 'hosp') return ['🏥', t('talk.hospital')]
    const rel = people.person?.circle?.find((c) => c.memberId === ch)?.relation.toLowerCase() ?? ''
    return [RELATION_ICON[rel] ?? '👤', first(memberName(people, ch))]
  }
  const chans = ['all', ...['mg', ...Object.keys(people.members), 'ooo', 'hosp'].filter((c) => all.some((s) => s.ch === c))]
  const pick = chans.includes(filter) ? filter : 'all'
  const list = all.filter((s) => pick === 'all' || s.ch === pick)
  const box = useRef<HTMLOListElement>(null)
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight }, [list.length])
  const last = all.length ? clockTime(all[all.length - 1].at, tz) : null
  return (
    <GlassCard span={7} id="call000">
      <div className="ch">
        <h2>{t('talk.title')}</h2>
        <span className="meta">{dialling ? t('call.dialling', { num }) : last && incident?.status !== 'CLOSED' ? t('talk.live', { time: last }) : t('talk.meta')}</span>
      </div>
      {all.length > 0 && (
        <div className="txf" role="group" aria-label={t('talk.filter')}>
          {chans.map((c) => {
            const [icon, name] = c === 'all' ? ['', t('talk.all')] : channel(c)
            return <button key={c} type="button" className="chip" aria-pressed={pick === c} onClick={() => setFilter(c)}>{icon ? `${icon} ${name}` : name}</button>
          })}
        </div>
      )}
      <ol className="tx" ref={box} aria-live="polite">
        {list.length ? list.map((s, k) => {
          const [icon, name] = channel(s.ch)
          return (
            <li key={`${s.at}-${k}`} className={s.agent ? 'ag' : 'ot'}>
              <span className="who">
                {clockTime(s.at, tz)} · {s.agent ? <><NoaOrb size={12} /> {t('talk.to', { name })}</> : `${icon} ${s.who}`}
              </span>
              <span className="b">{s.text}</span>
            </li>
          )
        }) : <li className="sys">{t('talk.none')}</li>}
      </ol>
      <p className="fine">{t('call.fine', { num })}</p>
    </GlassCard>
  )
}
