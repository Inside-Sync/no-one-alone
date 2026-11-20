import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { FamilyHealthEngine, FH_NS, RemoteAi, instantScheduler, realScheduler, textOf, type NoaLang, type NoaTransport, type PersonId, type Snapshot } from '../index'

/**
 * The panel's state outside React: one journey engine for the whole app (the Family health tab and the messages button on the
 * other Individual tabs share it, like the prototype's two shadow hosts), plus the few UI-only bits (open record drawer, chat).
 */
export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The api module (and the Firebase SDK behind it) loads on the first call, inside the 8 s race, not with the main bundle. */
const LAZY_NET: NoaTransport = {
  say: async (b, s) => (await import('@/data/api')).noaSay(b, s),
  understand: async (b, s) => (await import('@/data/api')).noaUnderstand(b, s),
}

/** Live AI only on the firebase data source (mirrors `LIVE` in data/repo) with `VITE_NOA_AI=on`; tests and mock builds stay prepared. */
export const liveAiOn = (env: Record<string, unknown> = import.meta.env): boolean =>
  env.MODE !== 'test' && env.VITE_DATA_SOURCE === 'firebase' && env.VITE_NOA_AI === 'on'

let engine: FamilyHealthEngine | null = null
let autoRan = false

export function getEngine(): FamilyHealthEngine {
  if (!engine) {
    const test = import.meta.env.MODE === 'test'
    engine = new FamilyHealthEngine({ ai: liveAiOn() ? new RemoteAi(LAZY_NET) : undefined, scheduler: test ? instantScheduler : realScheduler({ reducedMotion: reducedMotion() }) })
  }
  return engine
}
/** Tests: start again with a fresh engine (and let the auto-run happen again). */
export function resetFamilyHealthStore(e?: FamilyHealthEngine) {
  engine = e ?? null
  autoRan = false
  ui = { ...UI0 }
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
export interface UiState {
  drawer: PersonId | null; opener: HTMLElement | null; chat: boolean; toast: number | null
  /** Family tree: the full tree (null: no check started yet, or true) or the strip of person chips (false, once a check starts). */
  treeOpen: boolean | null
  /** The "Try it" readings panel is open (until the person starts a check, or the viewer closes it). */
  wiOpen: boolean
}
const UI0: UiState = { drawer: null, opener: null, chat: false, toast: null, treeOpen: null, wiOpen: true }
let ui: UiState = { ...UI0 }
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
