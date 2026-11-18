// Ported from the Test case prototype (new4.html). Every user-visible string is an i18n key in the `testcase`
// namespace (see locales/en/testcase.json); numbers, thresholds, ids and order are the prototype's.
import type { BarrierDef, EnablerDef, PvCase, PvId, StepDef } from './types'

/** Demo schedules: 14 well-child visits from 1 month to 6 years, a small subset of the 50+ IFHAS tests. */
export const WC_AGES: number[] = [1, 2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48, 60, 72]

export const BARRIERS: BarrierDef[] = [
  { id: 'awareness', label: 'prevention.barriers.awareness' },
  { id: 'access', label: 'prevention.barriers.access' },
  { id: 'trust', label: 'prevention.barriers.trust' },
  { id: 'value', label: 'prevention.barriers.value' },
  { id: 'forgot', label: 'prevention.barriers.forgot' },
  { id: 'decline', label: 'prevention.barriers.decline' },
]

/** Barrier -> the enabler (rule P3..P8) that removes it. */
export const ENABLER: Record<string, EnablerDef> = {
  awareness: {
    rule: 'P3',
    name: 'prevention.enablers.awareness.name',
    tag: 'prevention.enablers.awareness.tag',
  },
  access: { rule: 'P4', name: 'prevention.enablers.access.name', tag: 'prevention.enablers.access.tag' },
  trust: { rule: 'P5', name: 'prevention.enablers.trust.name', tag: 'prevention.enablers.trust.tag' },
  value: { rule: 'P6', name: 'prevention.enablers.value.name', tag: 'prevention.enablers.value.tag' },
  forgot: { rule: 'P7', name: 'prevention.enablers.forgot.name', tag: 'prevention.enablers.forgot.tag' },
  decline: {
    rule: 'P8',
    name: 'prevention.enablers.decline.name',
    tag: 'prevention.enablers.decline.tag',
  },
}

/** The four prevention cases (prototype PV). `inp.age` is months for children. Result routing lives in engine/prevention.ts. */
export const PV: Record<PvId, PvCase> = {
  wellchild: {
    kind: 'child',
    inp: { age: 18, nat: 'Emirati', overdue: 3, rem: 3 },
    barrier: 'access',
    teachRefer: 'child_speech',
    report: 'wc',
    family: [
      {
        name: 'prevention.pv.wellchild.family.0.name',
        what: 'prevention.pv.wellchild.family.0.what',
        state: 'prevention.pv.wellchild.family.0.state',
        cls: 'ok',
      },
      {
        name: 'prevention.pv.wellchild.family.1.name',
        what: 'prevention.pv.wellchild.family.1.what',
        state: 'prevention.pv.wellchild.family.1.state',
        cls: 'due',
      },
      {
        name: 'prevention.pv.wellchild.family.2.name',
        what: 'prevention.pv.wellchild.family.2.what',
        state: 'prevention.pv.wellchild.family.2.state',
        cls: 'due',
      },
      {
        name: 'prevention.pv.wellchild.family.3.name',
        what: 'prevention.pv.wellchild.family.3.what',
        state: 'prevention.pv.wellchild.family.3.state',
        cls: 'na',
      },
    ],
    slot: {
      access: 'prevention.pv.wellchild.slot.access',
      awareness: 'prevention.pv.wellchild.slot.awareness',
      trust: 'prevention.pv.wellchild.slot.trust',
      value: 'prevention.pv.wellchild.slot.value',
      forgot: 'prevention.pv.wellchild.slot.forgot',
    },
    visit: [
      {
        at: 0,
        title: 'prevention.pv.wellchild.visit.0.title',
        detail: 'prevention.pv.wellchild.visit.0.detail',
      },
      {
        at: 10,
        title: 'prevention.pv.wellchild.visit.1.title',
        detail: 'prevention.pv.wellchild.visit.1.detail',
      },
      {
        at: 20,
        title: 'prevention.pv.wellchild.visit.2.title',
        detail: 'prevention.pv.wellchild.visit.2.detail',
      },
      {
        at: 25,
        title: 'prevention.pv.wellchild.visit.3.title',
        detail: 'prevention.pv.wellchild.visit.3.detail',
      },
    ],
    result: {
      label: 'prevention.pv.wellchild.result.label',
      unit: 'prevention.pv.wellchild.result.unit',
      def: 2,
      min: 0,
      max: 30,
      step: 1,
      rule: 'prevention.pv.wellchild.result.rule',
    },
    refer: 'prevention.pv.wellchild.refer',
    follow: {
      refer: [
        {
          at: 0,
          title: 'prevention.pv.wellchild.follow.refer.0.title',
          detail: 'prevention.pv.wellchild.follow.refer.0.detail',
        },
        {
          at: 10080,
          title: 'prevention.pv.wellchild.follow.refer.1.title',
          detail: 'prevention.pv.wellchild.follow.refer.1.detail',
        },
        {
          at: 50400,
          title: 'prevention.pv.wellchild.follow.refer.2.title',
          detail: 'prevention.pv.wellchild.follow.refer.2.detail',
        },
        {
          at: 60480,
          title: 'prevention.pv.wellchild.follow.refer.3.title',
          detail: 'prevention.pv.wellchild.follow.refer.3.detail',
        },
      ],
      ok: [
        {
          at: 0,
          title: 'prevention.pv.wellchild.follow.ok.0.title',
          detail: 'prevention.pv.wellchild.follow.ok.0.detail',
        },
        {
          at: 5,
          title: 'prevention.pv.wellchild.follow.ok.1.title',
          detail: 'prevention.pv.wellchild.follow.ok.1.detail',
        },
      ],
    },
  },
  ifhas: {
    kind: 'adult',
    inp: { age: 47, nat: 'Emirati', overdue: 0, rem: 2 },
    barrier: 'value',
    teachRefer: 'dm',
    report: 'ifhas',
    family: [
      {
        name: 'prevention.pv.ifhas.family.0.name',
        what: 'prevention.pv.ifhas.family.0.what',
        state: 'prevention.pv.ifhas.family.0.state',
        cls: 'ok',
      },
      {
        name: 'prevention.pv.ifhas.family.1.name',
        what: 'prevention.pv.ifhas.family.1.what',
        state: 'prevention.pv.ifhas.family.1.state',
        cls: 'ok',
      },
      {
        name: 'prevention.pv.ifhas.family.2.name',
        what: 'prevention.pv.ifhas.family.2.what',
        state: 'prevention.pv.ifhas.family.2.state',
        cls: 'na',
      },
    ],
    slot: {
      value: 'prevention.pv.ifhas.slot.value',
      access: 'prevention.pv.ifhas.slot.access',
      trust: 'prevention.pv.ifhas.slot.trust',
      awareness: 'prevention.pv.ifhas.slot.awareness',
      forgot: 'prevention.pv.ifhas.slot.forgot',
    },
    why: 'prevention.pv.ifhas.why',
    visit: [
      {
        at: 0,
        title: 'prevention.pv.ifhas.visit.0.title',
        detail: 'prevention.pv.ifhas.visit.0.detail',
      },
      {
        at: 10,
        title: 'prevention.pv.ifhas.visit.1.title',
        detail: 'prevention.pv.ifhas.visit.1.detail',
      },
      {
        at: 15,
        title: 'prevention.pv.ifhas.visit.2.title',
        detail: 'prevention.pv.ifhas.visit.2.detail',
      },
      {
        at: 20,
        title: 'prevention.pv.ifhas.visit.3.title',
        detail: 'prevention.pv.ifhas.visit.3.detail',
      },
    ],
    result: {
      label: 'prevention.pv.ifhas.result.label',
      unit: 'prevention.pv.ifhas.result.unit',
      def: 7.4,
      min: 4.5,
      max: 12,
      step: 0.1,
      rule: 'prevention.pv.ifhas.result.rule',
    },
    refer: 'prevention.pv.ifhas.refer',
    follow: {
      refer: [
        {
          at: 0,
          title: 'prevention.pv.ifhas.follow.refer.0.title',
          detail: 'prevention.pv.ifhas.follow.refer.0.detail',
        },
        {
          at: 30,
          title: 'prevention.pv.ifhas.follow.refer.1.title',
          detail: 'prevention.pv.ifhas.follow.refer.1.detail',
        },
        {
          at: 1440,
          title: 'prevention.pv.ifhas.follow.refer.2.title',
          detail: 'prevention.pv.ifhas.follow.refer.2.detail',
        },
        {
          at: 129600,
          title: 'prevention.pv.ifhas.follow.refer.3.title',
          detail: 'prevention.pv.ifhas.follow.refer.3.detail',
        },
      ],
      ok: [
        {
          at: 0,
          title: 'prevention.pv.ifhas.follow.ok.0.title',
          detail: 'prevention.pv.ifhas.follow.ok.0.detail',
        },
        {
          at: 10,
          title: 'prevention.pv.ifhas.follow.ok.1.title',
          detail: 'prevention.pv.ifhas.follow.ok.1.detail',
        },
      ],
    },
  },
  expat: {
    kind: 'child',
    inp: { age: 4, nat: 'Expatriate', overdue: 0, rem: 0 },
    barrier: 'awareness',
    teachRefer: 'prev_ref',
    report: 'wc',
    family: [
      {
        name: 'prevention.pv.expat.family.0.name',
        what: 'prevention.pv.expat.family.0.what',
        state: 'prevention.pv.expat.family.0.state',
        cls: 'na',
      },
      {
        name: 'prevention.pv.expat.family.1.name',
        what: 'prevention.pv.expat.family.1.what',
        state: 'prevention.pv.expat.family.1.state',
        cls: 'na',
      },
    ],
    slot: {
      awareness: 'prevention.pv.expat.slot.awareness',
      access: 'prevention.pv.expat.slot.access',
      trust: 'prevention.pv.expat.slot.trust',
      value: 'prevention.pv.expat.slot.value',
      forgot: 'prevention.pv.expat.slot.forgot',
    },
    visit: [
      {
        at: 0,
        title: 'prevention.pv.expat.visit.0.title',
        detail: 'prevention.pv.expat.visit.0.detail',
      },
      {
        at: 10,
        title: 'prevention.pv.expat.visit.1.title',
        detail: 'prevention.pv.expat.visit.1.detail',
      },
      {
        at: 20,
        title: 'prevention.pv.expat.visit.2.title',
        detail: 'prevention.pv.expat.visit.2.detail',
      },
      {
        at: 25,
        title: 'prevention.pv.expat.visit.3.title',
        detail: 'prevention.pv.expat.visit.3.detail',
      },
    ],
    result: {
      label: 'prevention.pv.expat.result.label',
      unit: 'prevention.pv.expat.result.unit',
      def: 40,
      min: 0,
      max: 100,
      step: 1,
      rule: 'prevention.pv.expat.result.rule',
    },
    refer: 'prevention.pv.expat.refer',
    follow: {
      refer: [
        {
          at: 0,
          title: 'prevention.pv.expat.follow.refer.0.title',
          detail: 'prevention.pv.expat.follow.refer.0.detail',
        },
        {
          at: 20160,
          title: 'prevention.pv.expat.follow.refer.1.title',
          detail: 'prevention.pv.expat.follow.refer.1.detail',
        },
        {
          at: 20170,
          title: 'prevention.pv.expat.follow.refer.2.title',
          detail: 'prevention.pv.expat.follow.refer.2.detail',
        },
      ],
      ok: [
        {
          at: 0,
          title: 'prevention.pv.expat.follow.ok.0.title',
          detail: 'prevention.pv.expat.follow.ok.0.detail',
        },
        {
          at: 5,
          title: 'prevention.pv.expat.follow.ok.1.title',
          detail: 'prevention.pv.expat.follow.ok.1.detail',
        },
      ],
    },
  },
  bone: {
    kind: 'adult',
    inp: { age: 74, nat: 'Emirati', overdue: 0, rem: 3 },
    barrier: 'access',
    teachRefer: 'bone',
    report: 'ifhas2',
    family: [
      {
        name: 'prevention.pv.bone.family.0.name',
        what: 'prevention.pv.bone.family.0.what',
        state: 'prevention.pv.bone.family.0.state',
        cls: 'na',
      },
      {
        name: 'prevention.pv.bone.family.1.name',
        what: 'prevention.pv.bone.family.1.what',
        state: 'prevention.pv.bone.family.1.state',
        cls: 'ok',
      },
    ],
    slot: {
      access: 'prevention.pv.bone.slot.access',
      awareness: 'prevention.pv.bone.slot.awareness',
      trust: 'prevention.pv.bone.slot.trust',
      value: 'prevention.pv.bone.slot.value',
      forgot: 'prevention.pv.bone.slot.forgot',
    },
    visit: [
      {
        at: 0,
        title: 'prevention.pv.bone.visit.0.title',
        detail: 'prevention.pv.bone.visit.0.detail',
      },
      {
        at: 15,
        title: 'prevention.pv.bone.visit.1.title',
        detail: 'prevention.pv.bone.visit.1.detail',
      },
      {
        at: 30,
        title: 'prevention.pv.bone.visit.2.title',
        detail: 'prevention.pv.bone.visit.2.detail',
      },
      {
        at: 40,
        title: 'prevention.pv.bone.visit.3.title',
        detail: 'prevention.pv.bone.visit.3.detail',
      },
    ],
    result: {
      label: 'prevention.pv.bone.result.label',
      unit: null,
      def: -2.7,
      min: -4,
      max: 1,
      step: 0.1,
      rule: 'prevention.pv.bone.result.rule',
    },
    refer: 'prevention.pv.bone.refer',
    follow: {
      refer: [
        {
          at: 0,
          title: 'prevention.pv.bone.follow.refer.0.title',
          detail: 'prevention.pv.bone.follow.refer.0.detail',
        },
        {
          at: 1440,
          title: 'prevention.pv.bone.follow.refer.1.title',
          detail: 'prevention.pv.bone.follow.refer.1.detail',
        },
        {
          at: 10080,
          title: 'prevention.pv.bone.follow.refer.2.title',
          detail: 'prevention.pv.bone.follow.refer.2.detail',
        },
        {
          at: 525600,
          title: 'prevention.pv.bone.follow.refer.3.title',
          detail: 'prevention.pv.bone.follow.refer.3.detail',
        },
      ],
      ok: [
        {
          at: 0,
          title: 'prevention.pv.bone.follow.ok.0.title',
          detail: 'prevention.pv.bone.follow.ok.0.detail',
        },
      ],
    },
  },
}

/** Journey shell after the barrier is chosen (prototype prevSteps). Items of steps 1 and 5 come from `PV[pv].visit` / `follow`; step 3 has `text` (referred) and `textOk`. */
export const PREVENTION_STEPS: StepDef[] = [
  {
    mode: 'ind',
    kind: 'btn',
    label: 'stepLabel.book',
    title: 'prevention.steps.0.title',
    at: { m: 2 },
    hold: 'prevention.steps.0.hold',
    btn: 'prevention.steps.0.btn',
    text: 'prevention.steps.0.text',
    done: 'prevention.steps.0.done',
    decides: 'prevention.steps.0.decides',
    agents: [
      {
        agent: 'navigator',
        lines: ['prevention.steps.0.agents.navigator.0', 'prevention.steps.0.agents.navigator.1'],
      },
      { agent: 'voice', lines: ['prevention.steps.0.agents.voice.0'] },
    ],
    flow: [{ agent: 'voice' }, { agent: 'navigator' }, { label: 'flow.addr' }],
    phone: { tone: 'info', title: 'prevention.steps.0.phone.title', text: 'prevention.steps.0.phone.text' },
    pipe: [
      { node: 3, text: 'pipe.family_consent' },
      { node: 4, text: 'pipe.slot_found' },
      { node: 5, text: 'pipe.booking_sent' },
    ],
    fam: { who: 'prevention.steps.0.fam.who', text: 'prevention.steps.0.fam.text' },
    packet: [
      { title: 'prevention.steps.0.packet.0.title', detail: 'prevention.steps.0.packet.0.detail' },
      { title: 'prevention.steps.0.packet.1.title', detail: 'prevention.steps.0.packet.1.detail' },
      { title: 'prevention.steps.0.packet.2.title', detail: 'prevention.steps.0.packet.2.detail' },
      { title: 'prevention.steps.0.packet.3.title', detail: 'prevention.steps.0.packet.3.detail' },
    ],
  },
  {
    mode: 'hosp',
    kind: 'tl',
    label: 'stepLabel.visit',
    title: 'prevention.steps.1.title',
    at: { d: 4, h: '09:00' },
    hold: 'prevention.steps.1.hold',
    text: 'prevention.steps.1.text',
    done: 'prevention.steps.1.done',
    decides: 'prevention.steps.1.decides',
    agents: [
      {
        agent: 'courier',
        lines: ['prevention.steps.1.agents.courier.0', 'prevention.steps.1.agents.courier.1'],
      },
    ],
    flow: [{ agent: 'courier' }, { label: 'flow.clinic_team' }],
    phone: { tone: 'info', title: 'prevention.steps.1.phone.title', text: 'prevention.steps.1.phone.text' },
    pipe: [{ node: 5, text: 'pipe.visit_recorded' }],
    fam: { who: 'prevention.steps.1.fam.who', text: 'prevention.steps.1.fam.text' },
    back: true,
  },
  {
    mode: 'hosp',
    kind: 'result',
    label: 'stepLabel.result',
    title: 'prevention.steps.2.title',
    at: { d: 4, h: '12:00' },
    hold: 'prevention.steps.2.hold',
    text: 'prevention.steps.2.text',
    decides: 'prevention.steps.2.decides',
    agents: [
      {
        agent: 'insight',
        lines: ['prevention.steps.2.agents.insight.0', 'prevention.steps.2.agents.insight.1'],
      },
    ],
    flow: [{ label: 'flow.clinic' }, { agent: 'insight' }, { label: 'flow.team_or_passport' }],
    pipe: [{ node: 4, text: 'pipe.result_routed' }],
  },
  {
    mode: 'hosp',
    kind: 'refer',
    label: 'stepLabel.care',
    title: 'prevention.steps.3.title',
    at: { d: 5, h: '09:00' },
    hold: 'prevention.steps.3.hold',
    decides: 'prevention.steps.3.decides',
    agents: [
      { agent: 'navigator', lines: ['prevention.steps.3.agents.navigator.0'] },
      { agent: 'courier', lines: ['prevention.steps.3.agents.courier.0'] },
    ],
    flow: [{ agent: 'navigator' }, { agent: 'courier' }, { label: 'flow.team' }],
    pipe: [{ node: 5, text: 'pipe.referral_accepted' }],
    text: 'prevention.steps.3.textRefer',
    textOk: 'prevention.steps.3.textOk',
  },
  {
    mode: 'ind',
    kind: 'teach',
    label: 'stepLabel.explain',
    title: 'prevention.steps.4.title',
    at: { d: 5, h: '18:00' },
    hold: 'prevention.steps.4.hold',
    text: 'prevention.steps.4.text',
    decides: 'prevention.steps.4.decides',
    agents: [
      {
        agent: 'coach',
        lines: ['prevention.steps.4.agents.coach.0', 'prevention.steps.4.agents.coach.1'],
      },
    ],
    flow: [{ agent: 'coach' }, { label: 'flow.addr' }],
    phone: { tone: 'amber', title: 'prevention.steps.4.phone.title' },
    pipe: [{ node: 1, text: 'pipe.explained' }],
  },
  {
    mode: 'ind',
    kind: 'tl',
    label: 'stepLabel.follow_up',
    title: 'prevention.steps.5.title',
    at: { d: 12, h: '10:00' },
    hold: 'prevention.steps.5.hold',
    text: 'prevention.steps.5.text',
    done: 'prevention.steps.5.done',
    decides: 'prevention.steps.5.decides',
    agents: [
      {
        agent: 'navigator',
        lines: ['prevention.steps.5.agents.navigator.0', 'prevention.steps.5.agents.navigator.1'],
      },
      { agent: 'guardian', lines: ['prevention.steps.5.agents.guardian.0'] },
    ],
    flow: [{ agent: 'navigator' }, { agent: 'guardian' }, { label: 'flow.passport' }],
    phone: {
      tone: 'green',
      title: 'prevention.steps.5.phone.title',
      text: 'prevention.steps.5.phone.text',
    },
    pipe: [{ node: 4, text: 'pipe.loop_closed' }],
  },
  {
    mode: 'gov',
    kind: 'report',
    label: 'stepLabel.department',
    title: 'prevention.steps.6.title',
    at: { d: 16, h: '09:00' },
    hold: 'prevention.steps.6.hold',
    decides: 'prevention.steps.6.decides',
    agents: [
      {
        agent: 'analyst',
        lines: ['prevention.steps.6.agents.analyst.0', 'prevention.steps.6.agents.analyst.1'],
      },
    ],
    flow: [{ agent: 'analyst' }, { label: 'flow.health_centre' }, { label: 'flow.department_of_health' }],
    pipe: [{ node: 5, text: 'pipe.monthly_report' }, { node: 6, text: 'pipe.report_received' }],
  },
]

