'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from '@/app/navigation'
import { useNightDemo } from './useNightDemo'
import { TOUR_STEPS, tourPath, type TourStep } from '@/domain/tour'
import { useAppState } from './AppState'

export interface TourValue {
  /** Zero-based index of the step on screen; null while the walkthrough is closed. */
  index: number | null
  step: TourStep | null
  total: number
  start: () => void
  close: () => void
  next: () => void
  back: () => void
  /** The Play button of the night alert step. */
  play: () => void
}

const Ctx = createContext<TourValue | null>(null)

/** The CSS class that outlines the element a step points at. */
const HL = 'tour-hl'

/**
 * "Moza's case": starts at step 1, and every step navigates to its page (switching role where it says so), also when
 * the page is a placeholder. The night alert is stopped again when the walkthrough leaves its step or closes.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { setWho, setViewer } = useAppState()
  const night = useNightDemo()
  const [index, setIndex] = useState<number | null>(null)
  const startedNight = useRef(false)
  // The latest stop(): it changes with the route, and the step handlers must not re-create on every render.
  const stopRef = useRef(night.stop)
  useEffect(() => { stopRef.current = night.stop })
  const startRef = useRef(night.start)
  useEffect(() => { startRef.current = night.start })

  const stopNight = useCallback(() => {
    if (!startedNight.current) return
    startedNight.current = false
    stopRef.current()
  }, [])

  const show = useCallback((i: number) => {
    const s = TOUR_STEPS[i]
    if (!s.night) stopNight()
    if (s.who) setWho(s.who)
    if (s.who === 'family') setViewer('james')
    setIndex(i)
    router.push(tourPath(s))
  }, [router, setWho, setViewer, stopNight])

  const start = useCallback(() => show(0), [show])
  const close = useCallback(() => { stopNight(); setIndex(null) }, [stopNight])
  const next = useCallback(() => {
    if (index === null) return
    if (index < TOUR_STEPS.length - 1) show(index + 1)
    else close()
  }, [index, show, close])
  const back = useCallback(() => { if (index) show(index - 1) }, [index, show])
  const play = useCallback(() => {
    startedNight.current = true
    startRef.current()
  }, [])

  // Outline the step's target once its page has rendered, and bring it into view. A page that loads its data first swaps
  // its elements after the step opens, so the target is looked up again until the page has settled.
  const target = index === null ? null : TOUR_STEPS[index].target
  useEffect(() => {
    if (!target) return
    let scrolled = false
    let tries = 0
    const mark = () => {
      const el = document.querySelector(`[data-tour="${target}"]`)
      if (el && !el.classList.contains(HL)) {
        document.querySelectorAll('.' + HL).forEach((e) => e.classList.remove(HL))
        el.classList.add(HL)
      }
      if (el && !scrolled) {
        scrolled = true
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        const y = el.getBoundingClientRect().top + window.scrollY - 130
        window.scrollTo?.({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' })
      }
      if (!el && !scrolled && tries === 0) window.scrollTo?.({ top: 0 })
    }
    const timer = setInterval(() => { mark(); if (++tries >= 15) clearInterval(timer) }, 200)
    return () => { clearInterval(timer); document.querySelectorAll('.' + HL).forEach((e) => e.classList.remove(HL)) }
  }, [target, index])

  useEffect(() => {
    document.body.classList.toggle('tour-open', index !== null)
    return () => document.body.classList.remove('tour-open')
  }, [index])

  const value = useMemo<TourValue>(
    () => ({ index, step: index === null ? null : TOUR_STEPS[index], total: TOUR_STEPS.length, start, close, next, back, play }),
    [index, start, close, next, back, play],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTour(): TourValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTour must be used inside TourProvider')
  return v
}
