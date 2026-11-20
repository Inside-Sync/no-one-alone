import { SPEECH_TAKE, listen } from '@/features/familyHealth/ui/speechIo'

/**
 * The speech check listens for a long take, like the night alert: it keeps going through pauses (slow or slurred speech is heard
 * in full), ends a few seconds after the last word or at the maximum, and times the speaking up to the last word.
 */
type Res = { isFinal: boolean; 0: { transcript: string }; length: 1 }
class FakeRec {
  static last: FakeRec | null = null
  lang = ''; interimResults = false; continuous = false
  onresult: ((e: { resultIndex: number; results: Res[] }) => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  onstart: (() => void) | null = null
  stopped = false
  results: Res[] = []
  constructor() { FakeRec.last = this }
  start() { this.onstart?.() }
  stop() { if (this.stopped) return; this.stopped = true; this.onend?.() }
  say(text: string, isFinal = true) { this.results.push({ isFinal, 0: { transcript: text }, length: 1 }); this.onresult?.({ resultIndex: this.results.length - 1, results: this.results }) }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
  ;(window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = FakeRec
})
afterEach(() => {
  vi.useRealTimers()
  delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
})

test('a long take keeps listening through a pause and ends 3.5 s after the last word', () => {
  const done = vi.fn()
  listen('en', () => {}, done, SPEECH_TAKE)
  const r = FakeRec.last!
  expect(r.continuous).toBe(true)
  vi.advanceTimersByTime(800); r.say('The sky')
  vi.advanceTimersByTime(3000); r.say('is blue')            // a 3 s pause: still listening
  vi.advanceTimersByTime(2000); r.say('in Abu Dhabi')
  expect(done).not.toHaveBeenCalled()
  vi.advanceTimersByTime(SPEECH_TAKE.silenceMs)
  expect(done).toHaveBeenCalledTimes(1)
  const { text, secs } = done.mock.calls[0][0]
  expect(text).toBe('The sky is blue in Abu Dhabi')
  expect(secs).toBeCloseTo(5.8, 1)                           // up to the last word, not the silence after it
})

test('a long take stops at the maximum even if words keep coming', () => {
  const done = vi.fn()
  listen('en', () => {}, done, SPEECH_TAKE)
  const r = FakeRec.last!
  for (let t = 0; t < SPEECH_TAKE.maxMs; t += 2000) { vi.advanceTimersByTime(2000); r.say('word', false) }
  expect(done).toHaveBeenCalledTimes(1)
})

test('the composer dictation still ends at the first pause (no long take)', () => {
  const done = vi.fn()
  listen('en', () => {}, done)
  expect(FakeRec.last!.continuous).toBe(false)
})
