'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Contract 4.1: `audio/webm`, at most 30 s. */
const MAX_MS = 30_000

/** One voice reply: `start()` asks for the microphone, `stop()` resolves with the recording (auto-stops at 30 s). */
export function useRecorder(onDone: (audio: Blob) => void) {
  const [recording, setRecording] = useState(false)
  const rec = useRef<MediaRecorder | null>(null)
  const done = useRef(onDone)
  useEffect(() => { done.current = onDone }, [onDone])

  const stop = useCallback(() => {
    if (rec.current?.state === 'recording') rec.current.stop()
  }, [])

  const start = useCallback(async (): Promise<boolean> => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return false
    }
    const type = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
    const r = new MediaRecorder(stream, { mimeType: type })
    const chunks: Blob[] = []
    const cap = setTimeout(() => { if (r.state === 'recording') r.stop() }, MAX_MS)
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    r.onstop = () => {
      clearTimeout(cap)
      stream.getTracks().forEach((t) => t.stop())
      rec.current = null
      setRecording(false)
      if (chunks.length) done.current(new Blob(chunks, { type: 'audio/webm' }))
    }
    rec.current = r
    r.start()
    setRecording(true)
    return true
  }, [])

  // Release the microphone if the page goes away mid-recording (the partial reply is dropped).
  useEffect(() => () => {
    const r = rec.current
    if (r && r.state === 'recording') {
      r.ondataavailable = null
      r.stop()
    }
  }, [])

  return { recording, start, stop }
}
