import { createContext, useContext } from 'react'
import type { NoaLang } from '../index'

/** Microphone and speech-out state shared by the speech check, the composer and the read-aloud buttons. */
export interface PanelCtx {
  /** `prompt` while Noa reads the speech-check sentence aloud, then `speech` while the microphone listens. */
  listening: 'prompt' | 'speech' | 'comp' | null
  liveText: string
  micMsg: string
  startListen(target: 'speech' | 'comp'): void
  /** Noa reads the sentence, then the microphone opens for a long take. */
  startSpeechCheck(): void
  stopListen(): void
  say(text: string, lang: NoaLang): void
}
const noop = () => {}
export const PanelContext = createContext<PanelCtx>({ listening: null, liveText: '', micMsg: '', startListen: noop, startSpeechCheck: noop, stopListen: noop, say: noop })
export const usePanel = () => useContext(PanelContext)
