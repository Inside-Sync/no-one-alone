'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { CASES } from '../../data/cases'
import { TestCaseEngine, resolveText, setDateLocale, type CaseId, type Params, type Snapshot, type TFn, type Txt } from '../../engine'
import { useTestCase } from '../../entry/TestCaseContext'
import { intlLocale } from '@/i18n'
import { DEFAULT_SPEED, Driver, SPEEDS, type JudgeState, type Speed } from './driver'

export type Resolve = (x: Txt | string | number | null | undefined) => string

/** The playback controls of a run ("Run it for me" or the Judge path): pause, resume, back, skip and speed. */
export interface Playback {
  /** A run is on (or paused): the controls show. */
  active: boolean
  paused: boolean
  speed: Speed
  pause: () => void
  resume: () => void
  toggle: () => void
  back: () => void
  skip: () => void
  setSpeed: (s: Speed) => void
}

export interface TestCaseSession {
  engine: TestCaseEngine
  snap: Snapshot
  /** Engine text -> string in the current language. */
  r: Resolve
  /** The `testcase` namespace `t` (for keys that are not engine text). */
  tt: TFn
  ctx: Params
  judge: JudgeState | null
  playback: Playback
  /** Pick a case (a click in the picker): stops any run, loads the case, tells the shell. */
  pick: (id: CaseId) => void
  restart: () => void
  replay: () => void
  toggleAuto: () => void
  startJudge: () => void
  stop: () => void
}

export const isCaseId = (k: string | null | undefined): k is CaseId => !!k && Object.prototype.hasOwnProperty.call(CASES, k)

const SPEED_KEY = 'noa-tc-speed'
const loadSpeed = (): Speed => {
  try {
    const v = window.localStorage.getItem(SPEED_KEY)
    if (v && (SPEEDS as readonly string[]).includes(v)) return v as Speed
  } catch { /* storage blocked: the default */ }
  return DEFAULT_SPEED
}
const saveSpeed = (s: Speed) => { try { window.localStorage.setItem(SPEED_KEY, s) } catch { /* not remembered */ } }

const prefersReduced = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * One `TestCaseEngine` per overlay session (the overlay mounts this on open and unmounts it on close, so a reopened overlay starts fresh).
 * Owns the three timers through a `Driver`; all of them stop on unmount. The case comes from `useTestCase().caseKey` (deep link, banner),
 * the shell is told which case is showing (`setCaseKey`) and whether it is night (`setNight`).
 */
export function useTestCaseEngine(): TestCaseSession {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? i18n.language ?? 'en'
  const tc = useTestCase()
  const tt = useMemo(() => i18n.getFixedT(lang, 'testcase') as unknown as TFn, [i18n, lang])
  // Dates in the engine's log and tables are written in the app's locale (rows written earlier keep the language they were written in).
  setDateLocale(intlLocale(lang))
  const [engine] = useState(() => new TestCaseEngine({ t: tt, caseId: isCaseId(tc.caseKey) ? tc.caseKey : 'family', lang: lang === 'ar' ? 'ar' : 'en' }))
  const [judge, setJudge] = useState<JudgeState | null>(null)
  const driverRef = useRef<Driver | null>(null)
  const [pb, setPb] = useState<{ paused: boolean; speed: Speed }>(() => ({ paused: false, speed: loadSpeed() }))

  useEffect(() => { engine.setTranslator(tt) }, [engine, tt])
  // Noa speaks the app language by default; changing the app language moves it too (the header toggle still overrides it until then).
  const appLang = lang === 'ar' ? 'ar' : 'en'
  const lastApp = useRef(appLang)
  useEffect(() => {
    if (lastApp.current !== appLang) { lastApp.current = appLang; engine.setLang(appLang) }
  }, [engine, appLang])

  useEffect(() => {
    const d = new Driver(engine, {
      reduced: prefersReduced(),
      speed: loadSpeed(),
      onJudge: setJudge,
      onPlayback: () => setPb({ paused: d.paused, speed: d.speed }),
    })
    driverRef.current = d
    return () => { d.dispose(); driverRef.current = null }
  }, [engine])

  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)

  // The shell asks for another case while the overlay is open (deep link, `open(key)`): only a key the shell changed, not one pushed from here.
  const pushed = useRef<string | null>(tc.caseKey)
  useEffect(() => {
    if (tc.caseKey !== pushed.current) {
      pushed.current = tc.caseKey
      if (isCaseId(tc.caseKey) && tc.caseKey !== engine.S.ck) { driverRef.current?.stop(); engine.restart(tc.caseKey) }
    }
  }, [tc.caseKey, engine])
  // Tell the shell which case is showing (a click, the Judge path or the deep link all end here), and whether it is night.
  const ck = snap.state.ck
  const { setCaseKey } = tc
  useEffect(() => {
    if (pushed.current !== ck) { pushed.current = ck; setCaseKey(ck) }
  }, [ck, setCaseKey])
  const { setNight } = tc
  useEffect(() => { setNight(snap.night) }, [snap.night, setNight])
  useEffect(() => () => setNight(false), [setNight])

  const ctx = useMemo(() => engine.ctx(), [engine, snap])
  const r = useCallback<Resolve>((x) => resolveText(x, tt, ctx), [tt, ctx])

  const pick = useCallback((id: CaseId) => {
    driverRef.current?.stop()
    engine.restart(id)
  }, [engine])
  const restart = useCallback(() => { driverRef.current?.stop(); engine.restart() }, [engine])
  const replay = useCallback(() => { driverRef.current?.stop(); engine.replay() }, [engine])
  const toggleAuto = useCallback(() => driverRef.current?.setAuto(!engine.S.auto), [engine])
  const startJudge = useCallback(() => driverRef.current?.startJudge(), [])
  const stop = useCallback(() => driverRef.current?.stop(), [])

  const { paused, speed } = pb
  const active = paused || snap.state.auto || (!!judge && judge.phase !== 'done')
  const playback = useMemo<Playback>(() => ({
    active, paused, speed,
    pause: () => driverRef.current?.pause(),
    resume: () => driverRef.current?.resume(),
    toggle: () => { const x = driverRef.current; if (x) { if (x.paused) x.resume(); else x.pause() } },
    back: () => driverRef.current?.back(),
    skip: () => driverRef.current?.skip(),
    setSpeed: (s) => { saveSpeed(s); driverRef.current?.setSpeed(s) },
  }), [active, paused, speed])

  return useMemo(
    () => ({ engine, snap, r, tt, ctx, judge, playback, pick, restart, replay, toggleAuto, startJudge, stop }),
    [engine, snap, r, tt, ctx, judge, playback, pick, restart, replay, toggleAuto, startJudge, stop],
  )
}
