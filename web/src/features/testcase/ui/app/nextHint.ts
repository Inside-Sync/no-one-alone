import { CASES } from '../../data/cases'
import { FAMILY_MEMBERS } from '../../data/family'
import { nextFamilyAction, tx, type Snapshot, type TestCaseEngine } from '../../engine'
import type { Resolve } from './useTestCaseEngine'
import type { TA } from './parts'

/**
 * What the sticky bar's Next does now, in plain words (prototype nextHint): the family member and the action, the first move of a safety
 * or prevention case, the action of a later step by its kind, then the next step's title, and the end of the case.
 */
export function nextHint(engine: TestCaseEngine, snap: Snapshot, t: TA, r: Resolve): string {
  const S = snap.state, st = snap.step, i = S.step, n = snap.steps.length
  if (i === 0 && engine.isFam) {
    const a = nextFamilyAction(engine)
    if (a) {
      const m = FAMILY_MEMBERS.find((x) => x.id === a.who)
      return t('nextbar.hint.fam', { who: m ? r(tx(m.name)) : a.who, act: r(a.label) })
    }
  }
  if (i === 0 && engine.isPrev) {
    if (S.phase === 'setup') return t('nextbar.hint.passport')
    if (S.phase === 'ask') return t('nextbar.hint.barrier')
  }
  if (i === 0 && !engine.isFam && !engine.isPrev) {
    const night = CASES[S.ck].night && (S.ck !== 'own' || S.start < 360)
    if (S.phase === 'setup') return t(night ? 'nextbar.hint.playNight' : 'nextbar.hint.play')
    if (S.phase === 'playing') return t('nextbar.hint.watching')
    if (S.phase === 'decided' && S.dec?.path && snap.canNext && snap.steps[1]) return t('nextbar.next', { title: r(tx(snap.steps[1].title)) })
    if (S.phase === 'check') return t(S.speech.home ? 'nextbar.hint.answer' : 'nextbar.hint.speech')
  }
  if (snap.busy) return t('nextbar.working')
  if (i > 0 && !S.done[i]) {
    const k = st.kind === 'teach' ? (S.tb !== 'ok' ? 'teach' : 'plan') : st.kind
    return t(`nextbar.hint.kind.${k}`, { defaultValue: t('nextbar.hint.kind.btn') })
  }
  if (snap.canNext && snap.steps[i + 1]) return t('nextbar.next', { title: r(tx(snap.steps[i + 1].title)) })
  return i === n - 1 ? t('nextbar.done') : t('nextbar.hint.finish')
}
