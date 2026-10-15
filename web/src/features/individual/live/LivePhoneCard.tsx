'use client'

import { useEffect, useRef, useState } from 'react'
import { PhoneScreen } from '@/components/phone/PhoneScreen'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/components/ui/Toast'
import { apiErrorCode, audioUrl, LIVE_COPY } from '@/data/repo'
import type { CheckinInput } from '@/data/contract'
import type { LivePhone } from '@/domain/incident'
import { useRecorder } from './useRecorder'

/**
 * `Margaret's screen` for a live incident: the pending question, Yes / No or a voice reply posted to
 * `/api/incidents/{id}/checkin`, and `noReply` after `demo.noReplySeconds` without an answer (contract 3).
 */
export function LivePhoneCard({ phone, helpInitials, checkin }: { phone: LivePhone; helpInitials: string; checkin: (i: CheckinInput) => Promise<void> }) {
  const toast = useToast()
  const c = LIVE_COPY.live
  const [sending, setSending] = useState(false)
  // The question already answered (or timed out) from this screen: no second reply or timer for it.
  const answered = useRef<string | null>(null)

  const send = (input: CheckinInput, label?: string) => {
    if (phone.questionKey) answered.current = phone.questionKey
    setSending(true)
    checkin(input).then(
      () => { if (label) toast(c.answered(label)) },
      (e: unknown) => {
        answered.current = null
        toast(apiErrorCode(e) === 'INVALID_STATE' ? c.busy : c.failed)
      },
    ).finally(() => setSending(false))
  }

  const rec = useRecorder((audio) => send({ audio }))
  const waiting = Boolean(phone.questionKey) && !phone.busy && !sending && !rec.recording && (phone.yn || phone.voice)

  // No reply: one `noReply` per question, cancelled by any answer or by starting a recording.
  useEffect(() => {
    if (!waiting || !phone.questionKey || answered.current === phone.questionKey) return
    const key = phone.questionKey
    const t = setTimeout(() => {
      if (answered.current === key) return
      answered.current = key
      checkin({ noReply: true }).catch(() => { answered.current = null })
    }, phone.noReplySeconds * 1000)
    return () => clearTimeout(t)
  }, [waiting, phone.questionKey, phone.noReplySeconds, checkin])

  // Autoplay when the question or the instruction audio changes (contract 2.6). Browsers may block it: then silent.
  const played = useRef<string | null>(null)
  useEffect(() => {
    const path = phone.audioPath
    if (!path || played.current === path) return
    played.current = path
    let audio: HTMLAudioElement | null = null
    audioUrl(path).then((url) => {
      audio = new Audio(url)
      return audio.play()
    }).catch(() => {})
    return () => { audio?.pause() }
  }, [phone.audioPath])

  const disabled = phone.busy || sending
  const onRecord = () => {
    if (rec.recording) { rec.stop(); return }
    rec.start().then((ok) => { if (!ok) toast(c.noMic) }, () => toast(c.noMic))
  }

  return (
    <GlassCard id="liveC" className="c3">
      <div className="ch"><h2>{LIVE_COPY.phone.title}</h2><span className="meta">{LIVE_COPY.phone.meta}</span></div>
      <PhoneScreen
        time={phone.time}
        q={phone.q}
        small={sending ? c.sending : phone.small}
        flash={phone.flash}
        listen={rec.recording || phone.busy}
        help={phone.help}
        helpInitials={helpInitials}
        yn={phone.yn}
        disabled={disabled}
        onAnswer={(a) => send({ yesNo: a === LIVE_COPY.phone.yes ? 'YES' : 'NO' }, a)}
        record={phone.voice ? { label: rec.recording ? c.recording : c.record, recording: rec.recording, disabled: disabled && !rec.recording, onClick: onRecord } : undefined}
      />
      <p className="fine">{waiting ? c.noReplyIn(phone.noReplySeconds) : LIVE_COPY.phone.note}</p>
    </GlassCard>
  )
}
