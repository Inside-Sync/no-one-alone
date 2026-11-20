import { createContext, useContext } from 'react'
import type { NoaLang } from '../index'

/** Microphone and speech-out state shared by the speech check, the composer and the read-aloud buttons. */
export interface PanelCtx {
  listening: 'speech' | 'comp' | null
  liveText: string
  micMsg: string
  startListen(target: 'speech' | 'comp'): void
  stopListen(): void
  say(text: string, lang: NoaLang): void
}
const noop = () => {}
export const PanelContext = createContext<PanelCtx>({ listening: null, liveText: '', micMsg: '', startListen: noop, stopListen: noop, say: noop })
export const usePanel = () => useContext(PanelContext)
