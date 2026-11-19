import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { FamilyHealthEngine, FH_NS, instantScheduler, realScheduler, textOf, type NoaLang, type PersonId, type Snapshot } from '../index'

/**
 * The panel's state outside React: one journey engine for the whole app (the Family health tab and the messages button on the
 * other Individual tabs share it, like the prototype's two shadow hosts), plus the few UI-only bits (open record drawer, chat).
 */
export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let engine: FamilyHealthEngine | null = null
let autoRan = false

export function getEngine(): FamilyHealthEngine {
  if (!engine) {
    const test = import.meta.env.MODE === 'test'
    engine = new FamilyHealthEngine({ scheduler: test ? instantScheduler : realScheduler({ reducedMotion: reducedMotion() }) })
  }
  return engine
}
/** Tests: start again with a fresh engine (and let the auto-run happen again). */
export function resetFamilyHealthStore(e?: FamilyHealthEngine) {
  engine = e ?? null
  autoRan = false
  ui = { drawer: null, opener: null, chat: false, toast: null }
  emitUi()
}
/** Decision (c): the first time the tab opens in this page load, run test case s0 after 300 ms (prototype). */
export function claimAutoRun(): boolean {
  if (autoRan) return false
  autoRan = true
  return true
}

export function useSnapshot(): Snapshot {
  const e = getEngine()
  return useSyncExternalStore(e.subscribe, e.getSnapshot, e.getSnapshot)
}

/* ---------------------------------------------------------------- UI-only state */
/** `opener`: what opened the drawer, so closing it gives focus back there. `toast`: the note shown in the toast. */
export interface UiState { drawer: PersonId | null; opener: HTMLElement | null; chat: boolean; toast: number | null }
let ui: UiState = { drawer: null, opener: null, chat: false, toast: null }
const uiListeners = new Set<() => void>()
const emitUi = () => uiListeners.forEach((l) => l())
const subUi = (fn: () => void) => { uiListeners.add(fn); return () => { uiListeners.delete(fn) } }
export const getUi = (): UiState => ui
export function setUi(patch: Partial<UiState>) { ui = { ...ui, ...patch }; emitUi() }
export const useUi = (): UiState => useSyncExternalStore(subUi, getUi, getUi)

/* ---------------------------------------------------------------- text */
type T = (key: string, opts?: Record<string, unknown>) => string
/** The app language (chrome and prepared text follow it, decision a). */
export function useAppLang(): NoaLang {
  const { i18n: i } = useTranslation()
  return (i.resolvedLanguage ?? i.language ?? 'en').startsWith('ar') ? 'ar' : 'en'
}
/** `u(key, params)` for the panel chrome, `x(descriptor)` for the engine's texts, both in the app language. */
export function useTexts() {
  const lang = useAppLang()
  const { t } = useTranslation('familyHealthUi')
  const u = t as unknown as T
  const x = useMemo(() => textOf(i18n.getFixedT(lang, FH_NS) as unknown as T, lang), [lang])
  const raw = useCallback((k: string, o?: Record<string, unknown>) => (i18n.getFixedT(lang, FH_NS) as unknown as T)(k, o), [lang])
  return { u, x, raw, lang }
}
