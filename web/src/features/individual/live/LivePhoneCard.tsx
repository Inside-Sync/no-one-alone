'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PhoneScreen } from '@/components/phone/PhoneScreen'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/components/ui/Toast'
import { apiErrorCode, audioUrl } from '@/data/repo'
import type { CheckinInput } from '@/data/contract'
import type { LivePhone } from '@/domain/incident'
import { playRing } from './ring'
import { useRecorder } from './useRecorder'

/**
 * `Margaret's screen` for a live incident: the pending question, Yes / No or a voice reply posted to
 * `/api/incidents/{id}/checkin`, and `noReply` after `demo.noReplySeconds` without an answer (contract 3).
 */
export function LivePhoneCard({ phone, helpInitials, checkin }: { phone: LivePhone; helpInitials: string; checkin: (i: CheckinInput) => Promise<void> }) {
  const toast = useToast()
  const { t } = useTranslation('live')
  const [sending, setSending] = useState(false)
  // The question already answered (or timed out) from this screen: no second reply or timer for it.
  const answered = useRef<string | null>(null)

  const send = (input: CheckinInput, label?: string) => {
    if (phone.questionKey) answered.current = phone.questionKey
    setSending(true)
    checkin(input).then(
      () => { if (label) toast(t('live.answered', { a: label })) },
      (e: unknown) => {
        answered.current = null
        toast(apiErrorCode(e) === 'INVALID_STATE' ? t('live.busy') : t('live.failed'))
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

  // Ring once when an incident starts (VERIFYING, or its first question if that was missed); question audio waits for it.
  const ring = useRef<Promise<void> | null>(null)
  const rang = useRef(false)
  useEffect(() => {
    const firstQuestion = phone.questionKey?.startsWith('0:') && !rang.current
    if (!phone.flash && !firstQuestion) return
    rang.current = true
    ring.current = playRing()
  }, [phone.flash, phone.questionKey])

  // Autoplay when the question or the instruction audio changes (contract 2.6). Browsers may block it: then silent.
  const played = useRef<string | null>(null)
  useEffect(() => {
    const path = phone.audioPath
    if (!path || played.current === path) return
    played.current = path
    let audio: HTMLAudioElement | null = null
    let stopped = false
    ;(ring.current ?? Promise.resolve()).then(() => (stopped ? undefined : audioUrl(path))).then((url) => {
      if (!url) return
      audio = new Audio(url)
      return audio.play()
    }).catch(() => {})
    return () => { stopped = true; audio?.pause() }
  }, [phone.audioPath])

  const disabled = phone.busy || sending
  const onRecord = () => {
    if (rec.recording) { rec.stop(); return }
    rec.start().then((ok) => { if (!ok) toast(t('live.noMic')) }, () => toast(t('live.noMic')))
  }

  return (
    <GlassCard id="liveC" className="c3">
      <div className="ch"><h2>{t('phone.title')}</h2><span className="meta">{t('phone.meta')}</span></div>
      <PhoneScreen
        time={phone.time}
        q={phone.q}
        small={sending ? t('live.sending') : phone.small}
        flash={phone.flash}
        listen={rec.recording || phone.busy}
        help={phone.help}
        helpInitials={helpInitials}
        helpName={phone.helperName}
        caller={phone.callerName}
        yn={phone.yn}
        disabled={disabled}
        // PhoneScreen passes the button's label (`live:phone.yes` / `live:phone.no`) in the current language.
        onAnswer={(a) => send({ yesNo: a === t('phone.yes') ? 'YES' : 'NO' }, a)}
        record={phone.voice ? { label: rec.recording ? t('live.recording') : t('live.record'), recording: rec.recording, disabled: disabled && !rec.recording, onClick: onRecord } : undefined}
      />
      <p className="fine">{waiting ? t('live.noReplyIn', { s: phone.noReplySeconds }) : t('phone.note')}</p>
    </GlassCard>
  )
}
