// Ported from the Test case prototype (new4.html). Every user-visible string is an i18n key in the `testcase`
// namespace (see locales/en/testcase.json); numbers, thresholds, ids and order are the prototype's.
import type { StepDef } from './types'

/** Step 0 of the safety cases (`home`) and the prevention cases (`passport`). For `home` the engine appends the next agent to `flow` once decided; for `passport` it appends the Navigator when the decision has a path. */
export const STEP_ZERO: { home: StepDef; passport: StepDef } = {
  home: {
    mode: 'ind',
    kind: 'home',
    label: 'stepLabel.alert',
    title: 'stepZero.home.title',
    hold: 'stepZero.home.hold',
    decides: 'stepZero.home.decides',
    agents: [
      {
        agent: 'guardian',
        lines: ['stepZero.home.agents.guardian.0', 'stepZero.home.agents.guardian.1'],
      },
      { agent: 'voice', lines: ['stepZero.home.agents.voice.0', 'stepZero.home.agents.voice.1'] },
    ],
    flow: [{ label: 'flow.sensors' }, { agent: 'guardian' }, { agent: 'voice' }],
  },
  passport: {
    mode: 'ind',
    kind: 'passport',
    label: 'stepLabel.passport',
    title: 'stepZero.passport.title',
    hold: 'stepZero.passport.hold',
    decides: 'stepZero.passport.decides',
    agents: [
      {
        agent: 'guardian',
        lines: ['stepZero.passport.agents.guardian.0', 'stepZero.passport.agents.guardian.1'],
      },
      { agent: 'voice', lines: ['stepZero.passport.agents.voice.0'] },
      { agent: 'insight', lines: ['stepZero.passport.agents.insight.0'] },
    ],
    flow: [{ label: 'flow.passport' }, { agent: 'guardian' }, { agent: 'voice' }],
  },
}

