/**
 * Drawer and explainer copy from the prototype's script. Not served through the
 * DataSource (it is static UI copy), but kept verbatim here so later tasks do
 * not have to re-read the prototype.
 */

/** EXPLAIN (prototype line 1811): keyed by a lower-case fragment of the tile label. */
export const EXPLAIN: Readonly<Record<string, string>> = {
  'heart rate': 'How many times her heart beats each minute. Hers is a little higher than her usual, which can happen in hot weather.',
  'blood pressure': 'How hard blood pushes on the walls of her arteries. The top number has crept up for 6 weeks, which raises her stroke chance. Taking the evening tablet every day is the simplest fix.',
  'calm score': 'Also called heart rate variability. Higher means her body is relaxed and recovering; lower means more strain from heat, poor sleep or illness.',
  sleep: 'Time actually asleep. She is getting less than usual and waking more at night.',
  steps: 'Steps counted by her watch and phone.',
  'walking speed': 'How fast she walks on flat ground. A slower pace over weeks is one of the best early signs of a higher chance of falling.',
  tablets: 'The smart pill box records when each dose is taken.',
  'calls answered': 'How many of the daily check-in calls she picked up.',
  'speaking pace': 'Measured during the daily chat. Small changes can be early signs of tiredness, low mood or memory changes.',
  'time with people': 'Calls, visits and outings with other people.',
  'home temperature': 'From the sensor in her living room. Above 28° the body works harder, especially with heart conditions.',
  weight: 'From her bathroom scale. Sudden gain of 2 kg in 3 days can mean fluid build-up.',
  pollen: 'Spring grass pollen. On windy, stormy days it can trigger asthma, even in people who rarely have it.',
  'sun strength': 'The UV index. 11 is extreme: skin can burn in under 10 minutes.',
  'plane noise': 'Marrickville is under the airport flight path. Flights stop between 11 pm and 6 am, so her sleep is not affected.',
  'pre-arrival packets': 'FHIR R4 bundles (Patient, Condition, MedicationStatement, AllergyIntolerance, Observation) pushed to the ED on escalation, with consent on file.',
  'door to ct': 'Median minutes from ED arrival to first CT head for suspected stroke, packet-enabled arrivals vs historical baseline.',
  'notice before arrival': 'Median interval between packet receipt and ambulance arrival at triage.',
}

/** Fallbacks used by `explainFor` when no key matches (line 1830). */
export const EXPLAIN_FALLBACK = {
  hospital: 'Rolling metric computed from enrolled-patient feeds and ED information system extracts; refreshed every 15 minutes.',
  community: 'Aggregated across enrolled residents in the 15 Inner West suburbs. Groups under 10 are suppressed.',
  individual: "Compared with Margaret's own usual over the last 30 days, so it reflects what is normal for her.",
} as const

/** "Ask the agent" drawer (lines 1547–1548). */
export const CHAT_INTRO =
  'Mum is steady today. One thing to act on: her blood pressure has drifted up for 6 weeks, and Thursday will be 38 °C.'

export const CHAT_QA: readonly [question: string, answer: string][] = [
  ['How did she sound today?', 'Clear and cheerful at 13:02. Speech rate 132 wpm, a little slower than her usual 141, and she said "pardon?" twice, so captions stay on.'],
  ['Why is stroke risk high?', "Four drivers: morning blood pressure up 14 mmHg, 3 missed evening doses, two relatives with stroke before 70, and two irregular-rhythm alerts this week. It's a risk level, not a diagnosis."],
  ["What about Thursday's heat?", "I'll add a midday check-in, remind her about fluids every 2 hours and offer a lift to the library cool room. Aisha next door can check on her at 15:00."],
  ['What should I do this week?', 'Approve the pill box task for David and book her GP review. Both are one tap. I can also draft a message to Sarah.'],
]

/** "Script for 000" drawer (line 1545). */
export const SOS_SCRIPT = {
  intro: 'Ask for ambulance. Read this aloud.',
  address: '186 Marrickville Rd, Marrickville NSW 2204',
  rows: [
    ['Address', '186 Marrickville Rd, Marrickville NSW 2204'],
    ['Patient', 'Margaret Collins, 78, lives alone'],
    ['Symptoms', 'Slurred speech since 02:04, heart rate 142'],
    ['Last well', '01:55'],
    ['Medicines', 'Amlodipine, aspirin, atorvastatin · allergic to penicillin'],
    ['Access', 'Brother arriving 02:11 with key · neighbour Aisha holds a spare'],
  ] as readonly (readonly [string, string])[],
  note: 'The agent prepares this. A person makes the call.',
} as const

/** Pre-arrival packet drawer footnote (line 1546). */
export const PACKET_NOTE = 'Sent as a FHIR bundle to the receiving ED only during an emergency, with consent on file.'

/** Notifications drawer (line 1880): [emoji, text, when, tone]. */
export const NOTIFICATIONS: readonly (readonly [string, string, string, 'good' | 'warn' | 'bad'])[] = [
  ['⚠️', 'Needs your OK: weekly pill box by David', 'Yesterday 21:40', 'warn'],
  ['🔥', 'Heat warning for Thursday · plan ready', '2 h ago', 'warn'],
  ['🛡️', 'Scam door-knocks reported on her street', '5 h ago', 'bad'],
  ['✅', 'Blood pressure report read by Dr Patel', 'Yesterday 16:42', 'good'],
  ['😊', 'Margaret had a cheerful chat at 13:02', '2 h ago', 'good'],
]

/** `actions()` buttons of the condition drawer (prototype line 1873): [label, toast, done]. */
export const COND_ACTIONS: readonly (readonly [label: string, toast: string, done: string])[] = [
  ['🗣️ Ask her about it', 'Added to her next chat', 'Added'],
  ['🩺 Raise with Dr Patel', 'Added to the GP visit agenda', 'Added'],
]

/**
 * `ONCE` (prototype line 1855): a button whose text matches a key turns into a
 * disabled "✓ …" button after its first click.
 */
export const ONCE_LABELS: Readonly<Record<string, string>> = {
  Approve: '✓ Approved',
  'Ask David to set up a pill box': '✓ David asked',
  'Send BP report to Dr Patel': '✓ Sent',
  'Call Mum': '📞 Calling…',
}

/** Static headings and captions of the individual Home page (prototype lines 546–700). */
export const HOME_COPY = {
  today: { title: '🟢 Margaret today', soFar: 'Today so far', soFarMeta: 'What Margaret shares with you' },
  profile: {
    title: '👤 About Margaret',
    share: { label: '📤 Share profile', done: 'Shared' },
    conditionsTitle: '🩺 Health conditions',
    conditionsMeta: 'Tap one for detail',
  },
  wellbeing: {
    title: '🧭 Overall wellbeing',
    meta: 'Compared with her usual month',
    ariaLabel: 'Overall wellbeing 72 out of 100: body 61, medicines 68, moving 74, sleep 70, social 82, memory 88, home 58',
    legend: ['Now', 'Last month'],
  },
  rhythm: {
    title: '🕰️ Daily rhythm',
    meta: 'When she is up and about, each hour of the week',
    legend: ['Less', 'More', 'Unusual for her'],
  },
  plan: { title: "This week's plan", approve: { label: 'Approve', toast: 'Approved · David has been asked', done: 'Approved' } },
  circle: {
    title: '💞 Her care circle',
    meta: 'Drag to turn · tap a person',
    ariaLabel:
      'Care circle around Margaret: David and the community nurse nearby, Sarah and James far away, the stroke centre on the care ring',
  },
  chat: { title: "🗣️ Today's chat with her" },
  home: { title: '🏠 Her home today' },
  near: { title: '🤝 People and places near her', meta: 'Within 1 km' },
  helper: {
    title: '🤖 What the helper did today',
    meta: 'Every step is recorded so the family can check it',
    columns: ['Time', 'What it did', 'How', 'Why', 'Result'],
    approve: { label: 'Approve', toast: 'Approved · David has been asked' },
  },
  mapControls: { left: 'Rotate left', right: 'Rotate right', reset: 'Reset view' },
} as const

/** Detail-drawer buttons of the individual view: [label, toast, done] (prototype lines 1840–1850). */
export const DRAWER_ACTIONS = {
  /** `tbody tr` click: devices and air tables. */
  row: [['🗣️ Ask her about it', 'Added to her next chat', 'Added'], ['📤 Share with family', 'Shared', 'Shared']],
  /** `.alerts li` click. */
  alert: [
    ['🗣️ Tell Margaret by voice', 'Margaret will hear this in her next call', 'Will tell her'],
    ['📤 Share with David', 'Sent to David', 'Sent'],
    ['✅ Mark as handled', 'Marked as handled', 'Handled'],
  ],
  /** `.news li` click. */
  news: [
    ['🗣️ Read it to Margaret', 'She will hear a short version at 18:00', 'Queued'],
    ['📤 Share with family', 'Shared with the care circle', 'Shared'],
  ],
} as const satisfies Record<string, readonly (readonly [label: string, toast: string, done: string])[]>

/** Static headings, legends and chart captions of the individual Health page (prototype lines 918–967, 1604–1660). */
export const HEALTH_COPY = {
  goals: { title: "🎯 Today's goals", meta: 'Set with her GP' },
  hr: {
    title: '❤️ Heartbeat over the last day',
    meta: 'Beats per minute',
    ariaLabel: 'Heart rate over 24 hours: 55 to 62 asleep with two irregular rhythm alerts at 02:14 and 03:40, peak 112 on the morning walk',
    asleep: 'asleep',
    legend: [
      { color: '#ef6a5e', label: 'Heart rate' },
      { color: 'rgba(239,106,94,.12)', label: 'Min–max band' },
      { color: '#c2417a', label: 'Uneven heartbeat alert', round: true },
      { color: '#1fb39c', label: 'Walk', round: true },
    ],
  },
  hypno: {
    title: "😴 Last night's sleep",
    ariaLabel: 'Sleep stages: 6 wakes, 52 minutes deep sleep, 52 minutes REM',
  },
  mood: {
    title: '😊 Mood, last 2 weeks',
    meta: 'From her own taps and how she sounds',
    ariaLabel: 'Mood over 14 days, mostly pleasant, dips on two hot days, highest on walking group days',
    top: 'Pleasant',
    bottom: 'Unpleasant',
    hot: 'hot',
    walk: 'walk',
  },
  steps: { title: '👣 Steps, last 2 weeks', meta: 'Goal 3,500', ariaLabel: 'Steps over 14 days, goal met on 7 days', goal: 'goal 3,500' },
  bp: {
    title: '🩺 Blood pressure, last 2 weeks',
    meta: 'Morning and evening readings',
    ariaLabel: 'Morning systolic rose from 134 to 146 and evening from 128 to 139 over 14 days',
    legend: [
      { color: '#c88a05', label: 'Morning systolic' },
      { color: '#5a7fe0', label: 'Evening systolic' },
      { color: 'rgba(31,179,156,.15)', label: 'Target under 135' },
    ],
  },
  devices: { title: '📲 Where this comes from', columns: ['Device', 'Metrics', 'Frequency', 'Battery / status', 'Shared with'] },
} as const

/** Static headings and captions of the individual Around-her page (prototype lines 960–997, 1664–1695). */
export const AROUND_COPY = {
  mapChip: 'Tap a pin for detail',
  thursday: {
    title: '🔥 Thursday, hour by hour',
    meta: 'Outside vs how warm her home will get',
    ariaLabel:
      'Thursday outdoor temperature peaks at 38 degrees at 13:00; indoor would reach 34 without air-con; agent moves Margaret to the library cool room from 11:00 to 16:00',
  },
  air: {
    title: '🍃 Air, pollen and smoke',
    meta: '7-day outlook',
    columns: ['Day', 'Air quality', 'PM2.5', 'Pollen', 'Smoke', 'Advice'],
  },
  newsFilterLabel: 'News filter',
  /** `SEV` (prototype line 1680). */
  severity: {
    act: { color: '#d9443f', label: 'Act' },
    aware: { color: '#c88a05', label: 'Be aware' },
    help: { color: '#1fb39c', label: 'Helpful' },
    done: { color: '#56706e', label: 'Resolved' },
  },
} as const

/** Static headings and captions of the individual What's-ahead page (prototype lines 699–747, 1445–1473). */
export const FORECAST_COPY = {
  modelTitle: 'ℹ️ How this forecast works',
  risks: {
    title: '📊 Chances over time',
    meta: 'Out of 100 women like Margaret',
    columns: ['What could happen', 'Next month', 'Next 3 months', 'Next year', 'Likely range', 'Level', 'Trend', 'Main reason'],
  },
  sim: {
    title: '🎛️ Try it: what if…',
    meta: 'Move the sliders',
    hearingSwitchLabel: 'Wears hearing aids daily',
    adherenceValue: (n: number) => `${n}%`,
    cells: [
      { key: 'stroke', label: 'Stroke · 90 d' },
      { key: 'fall', label: 'Fall · 90 d' },
      { key: 'admission', label: 'Admission · 90 d' },
      { key: 'mci', label: 'MCI · 90 d' },
    ],
  },
  bp: {
    title: 'Morning systolic blood pressure',
    meta: 'Observed 6 weeks · projected 4 weeks · mmHg',
    yLabel: 'Morning systolic blood pressure',
    ariaLabel: 'Morning systolic blood pressure rose from 128 to 146 over six weeks and is projected to reach 156 without changes',
    today: 'today',
    weekLabel: (n: number) => `W${n}`,
    legend: [
      { color: '#c88a05', label: 'Observed' },
      { color: 'rgba(217,68,63,.5)', label: 'Projected if nothing changes' },
      { color: 'rgba(31,179,156,.6)', label: 'Projected at 100% adherence' },
      { color: '#8f6fd0', label: 'Your what-if scenario' },
      { color: 'rgba(31,179,156,.15)', label: 'Target under 135' },
    ],
  },
  shap: { title: '⚖️ What pushes her stroke chance up or down', meta: 'Red pushes up · green pulls down' },
  signs: {
    title: '👀 What we keep an eye on',
    meta: 'Today compared with her usual',
    columns: ['Sign', 'From', 'How often', 'Now', 'Usual', 'Compared with usual', 'Status'],
    status: { good: 'Fine', warn: 'Watch', bad: 'Act' },
  },
  /** Mode-button click: tag text and toast (line 1473). */
  modes: { on: 'ON', off: 'OFF', toast: (name: string, on: boolean) => `${name} mode ${on ? 'on' : 'off'}` },
} as const

/** Individual · Emergency (prototype lines 812–845 and the 000 script, line 1545). */
export const LIVE_COPY = {
  idle: {
    title: 'No active alert',
    body: "When an alert comes in, this page shows the response minute by minute: who is on the way, what Margaret's screen shows and when the hospital has her record. 37 alerts in the community this week, 29 filtered as false alarms without waking anyone.",
    run: 'Run the 02:03 night alert demo',
  },
  endDemo: 'End demo',
  orbitLabel: 'Care circle in emergency: help moving toward Margaret',
  since: 'since alert',
  /** Page subtitle while the demo runs (`pgSub`, line 1577). */
  subtitle: (time: string) => `Live · ${time} AEDT · 186 Marrickville Rd`,
  actions: {
    call000: 'Call 000',
    callMum: { label: 'Call Mum', toast: 'Calling Mum · captions on' },
    callDavid: { label: 'Call David', toast: 'Calling David' },
  },
  timeline: { title: 'Live timeline', meta: 'Shared with the circle' },
  player: { prev: 'Previous step', next: 'Next step', pause: 'Pause', play: 'Play' },
  phone: {
    title: "Margaret's screen",
    meta: 'Same moment',
    note: 'Hearing mode is on, so every question is also shown in large text with yes/no buttons.',
    header: (time: string) => `${time} · Hearing mode`,
    yes: 'Yes',
    no: 'No',
    answered: (a: string) => `Margaret: ${a}`,
  },
  sos: {
    title: 'Script for 000',
    intro: 'Ask for ambulance. Read this aloud.',
    rows: [
      ['Address', '186 Marrickville Rd, Marrickville NSW 2204'],
      ['Patient', 'Margaret Collins, 78, lives alone'],
      ['Symptoms', 'Slurred speech since 02:04, heart rate 142'],
      ['Last well', '01:55'],
      ['Medicines', 'Amlodipine, aspirin, atorvastatin · allergic to penicillin'],
      ['Access', 'Brother arriving 02:11 with key · neighbour Aisha holds a spare'],
    ],
    call: 'Call 000',
    callToast: 'Dialling 000 · ask for ambulance',
    copy: 'Copy address',
    copied: 'Address copied',
    note: 'The agent prepares this. A person makes the call.',
  },
} as const
