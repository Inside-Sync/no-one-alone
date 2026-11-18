import { QUESTIONS } from '../data/questions'
import type { SampleKey } from '../data/types'
import type { TestCaseEngine } from './state'

/** The family autopilot clicks the first open alert action of this list (prototype order). */
const FAMILY_SCRIPT = ['moza_ok', 'book_hind', 'book_maitha', 'book_khalid', 'book_amna', 'book_saeed', 'book_sultan']

/**
 * One tick of "Run it for me" (prototype autoTick): look at where the case is and do the one thing a person would do next.
 * Returns true when the run is over (nothing more to do: a "no action" outcome, or the last step is done).
 * The script, per place:
 *  - family step 0: moza_ok, book Hind, Maitha, Khalid, Amna, Saeed, Sultan, then next;
 *  - prevention step 0: check the passport, answer the case's barrier, next (stops at P2 / P8);
 *  - safety step 0: play, the case's speech sample, the case's answer (or the first option), next (stops at R12 / stand down);
 *  - later steps: tl -> next update; btn -> act; teach -> teach-back passed, then send the plan; recheck -> 5.1 mmol/L;
 *    daily -> usual speech, then send the default reading; accept; report; result / refer / famresult -> send; then next.
 */
export function runAutoStep(e: TestCaseEngine): boolean {
  const S = e.S, st = e.cur(), i = S.step, c = e.caseDef
  if (i === 0 && e.isFam) {
    const nx = FAMILY_SCRIPT.find((id) => S.fm!.alerts.some((a) => a.state === 'open' && a.acts.some((y) => y.id === id)))
    if (nx) e.famAct(nx)
    else if (e.canNext()) e.next()
    else return true
  } else if (i === 0 && e.isPrev) {
    if (S.phase === 'setup') e.checkPassport()
    else if (S.phase === 'ask') e.chooseBarrier(e.pvDef.barrier)
    else if (S.phase === 'decided') { if (S.dec?.path) e.next(); else return true }
  } else if (i === 0) {
    if (S.phase === 'setup') e.play()
    else if (S.phase === 'check') {
      if (!S.speech.home) e.sampleSpeech((c.speech || 'usual') as SampleKey)
      else if (S.qk && QUESTIONS[S.qk] && !S.ans) {
        // set directly, no "answer" log line: that is what the prototype does
        S.ans = c.ans || QUESTIONS[S.qk].a[0].id
        e.answerSilently()
      }
    } else if (S.phase === 'decided') { if (S.dec?.path) e.next(); else return true }
  } else if (!S.done[i]) {
    switch (st.kind) {
      case 'tl': e.tlNext(); break
      case 'btn': e.btnAct(); break
      case 'teach':
        if (S.tb !== 'ok') e.passTeachBack()
        else e.sendPlan()
        break
      case 'recheck': e.setRecheckVal(5.1); e.recheck(); break
      case 'daily': if (!S.speech.daily) e.sampleSpeech('usual'); else e.sendDaily(); break
      case 'accept': e.accept(); break
      case 'report': e.report(); break
      case 'result': e.sendResult(); break
      case 'refer': e.referAct(); break
      case 'famresult': e.famSendResults(); break
    }
  } else if (e.canNext()) e.next()
  else return true
  return false
}

/**
 * Run the autopilot to the end instantly, driving the playback and the pipeline animation without timers.
 * Returns the number of ticks. Stops after `maxTicks` (a safety net; the longest case needs about 40).
 */
export function runAutopilot(e: TestCaseEngine, maxTicks = 500): number {
  e.setAuto(true)
  let n = 0
  while (e.S.auto && n < maxTicks) {
    e.drain()
    n++
    if (e.autoStep() == null) break
  }
  e.drain()
  return n
}
