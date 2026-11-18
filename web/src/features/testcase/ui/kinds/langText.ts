'use client'

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveText, type Lang, type TestCaseEngine, type Snapshot, type TFn } from '../../engine'
import type { Resolve } from './types'

/**
 * Resolves engine text in the language Noa speaks (`state.lang`), not the app language: the teach-back, the speech sentence and what the
 * phone says read in one language with names and tokens to match. Names follow the toggle.
 */
export function useSpeakResolve(engine: TestCaseEngine, snap: Snapshot): Resolve {
  const { i18n } = useTranslation()
  const lang = snap.state.lang
  const ctx = engine.ctx()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback<Resolve>((x) => resolveText(x, i18n.getFixedT(lang, 'testcase') as unknown as TFn, ctx), [i18n, lang, snap.version])
}

/** `dir` and `lang` for a block written in `lang`, so punctuation and order are right inside a page of the other direction. */
export const langAttrs = (lang: Lang): { dir: 'rtl' | 'ltr'; lang: Lang } => ({ dir: lang === 'ar' ? 'rtl' : 'ltr', lang })
