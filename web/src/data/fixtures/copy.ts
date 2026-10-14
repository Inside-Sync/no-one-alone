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
  Review: '✓ Reviewed',
  'Page stroke team': '✓ Paged',
  Divert: '✓ Diversion sent',
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

/** Toast and audit text when a consent change could not be stored and was undone. */
export const SAVE_FAILED = "Couldn't save that change · it has been undone"

/** "Kept private" sheet opened by tapping a locked card (prototype line 1990). */
export const KEPT_PRIVATE = {
  title: '🔒 Kept private',
  /** `viewerName` is `you` for James, like the prototype. */
  body: (viewerName: string, paused: boolean): string =>
    `Margaret has chosen not to share this with ${viewerName}${
      paused
        ? ' right now. She paused sharing until 9 am tomorrow. Safety alerts still reach you.'
        : ". That's her choice, and she can change it any time."
    }`,
  action: { label: '💬 Ask Margaret kindly', toast: 'Margaret will get a gentle request she can say yes or no to', done: 'Request sent' },
} as const

/** Margaret's own "My day" page (prototype `meMain`, lines 1914–1958). */
export const ME_COPY = {
  hello: 'Good afternoon, Maggie 🌞',
  sub: "You're doing well today. Here's your day, just for you.",
  tiles: [
    { emoji: '❤️', title: 'Heart', note: '68 · steady', warn: false },
    { emoji: '👣', title: '3,240 steps', note: 'nearly at 3,500!', warn: false },
    { emoji: '😴', title: '6 h sleep', note: 'a bit short', warn: true },
    { emoji: '💧', title: 'Water', note: 'have a glass now', warn: true },
    { emoji: '💊', title: 'Next tablet', note: '6 pm, amlodipine', warn: false },
    { emoji: '📞', title: 'James calls', note: 'tonight at 8 pm', warn: false },
  ],
  people: { title: '💞 Your people', meta: 'You choose what each sees', change: '🔐 Change who sees what' },
  ideasTitle: '💡 Ideas for you',
  ideasMeta: 'Only if you want them',
  ideas: [
    { emoji: '🔥', title: 'Thursday will be 38°. Would you like a lift to the library cool room?', note: 'Tom, a volunteer, can pick you up at 11.', yes: ['Yes please', 'Lift booked for Thursday 11:00', 'Booked'], no: ['No thanks', "No problem, we'll check in by phone instead", 'Not now'] },
    { emoji: '💊', title: 'Would a weekly pill box help with the evening tablet?', note: 'David offered to set it up on Saturday.', yes: ['Yes please', 'David will come Saturday 10:00', 'Yes'], no: ['No thanks', "Okay, we'll keep the reminder only", 'Not now'] },
    { emoji: '🦻', title: "Pop your hearing aids in for this afternoon's chat?", note: 'It makes the calls easier.', yes: ['Done', 'Lovely', 'Done'], no: ['Later', "That's fine", 'Later'] },
  ],
  promise: {
    title: '🔐 Your privacy promise',
    meta: 'Health support, not watching',
    items: [
      { emoji: '✋', bold: "You're in charge.", text: 'You decide who sees what, and you can change it any time.' },
      { emoji: '📷', bold: 'No cameras, ever.', text: 'Home sensors only notice movement and temperature.' },
      { emoji: '🎙️', bold: 'No listening in.', text: 'The microphone is only on during calls you answer.' },
      { emoji: '📍', bold: 'No tracking.', text: 'Location is off. If you turn it on, people only see "home" or "out".' },
      { emoji: '🚨', bold: 'Emergencies only:', text: 'David and James always get safety alerts, so help can come.' },
    ],
    settings: 'See all settings',
  },
  access: {
    title: '👀 Who looked at your information',
    meta: 'So nothing happens behind your back',
    head: ['When', 'Who', 'What they looked at', 'Why'],
    rows: [
      ['Today 09:12', 'James', 'Your heart and blood pressure summary', 'Weekly look'],
      ['Today 08:40', 'David', '"I\'m OK" check-in', 'Morning check'],
      ['Yesterday 16:42', 'Dr Patel', 'Blood pressure report', 'You agreed to send it'],
      ['Yesterday 11:05', 'Priya', 'Tablets taken this week', 'Nurse visit planning'],
      ['Mon 19:30', 'Sarah', 'Sleep and steps', 'Called you afterwards'],
    ],
  },
} as const

/** "Who sees what" page (prototype `prMain`, lines 1960–1975). */
export const PRIVACY_COPY = {
  title: '🔐 Who sees what',
  meta: 'Tap a switch to share or stop sharing · changes apply straight away',
  quick: 'Quick choices:',
  presets: [
    { kind: 'family', label: '👨‍👩‍👧 Family sees most, not my mood' },
    { kind: 'safety', label: '🚨 Safety alerts only' },
    { kind: 'all', label: '🤝 Share everything with family' },
  ],
  pause: '⏸️ Pause sharing until tomorrow',
  resume: '▶️ Resume sharing',
  what: 'What',
  lockedTitle: 'Always on for emergency contacts',
  fine: "🚨 Safety alerts can't be turned off for your emergency contacts, so someone can always come if you need help. You can change who your emergency contacts are.",
  preview: { title: '👁️ Preview', meta: 'See exactly what someone sees', toast: (name: string) => `Previewing what ${name} sees` },
  emergency: {
    title: '🏥 In an emergency',
    meta: 'Agreed 1 October',
    text: 'If you need an ambulance, the hospital receives your conditions, tablets and allergy, so they can help quickly. Nothing else, and only for that visit.',
    agreement: ['Read the agreement', 'Your emergency agreement is shown on your phone', 'Opened'],
    contacts: ['Emergency contacts', 'Emergency contacts: David and James', 'Checked'],
    clinician: 'Clinicians see named patients only where the patient consented to hospital sharing.',
  },
  audit: { title: '🧾 Changes you made', meta: 'Newest first', empty: 'No changes yet', label: 'Audit log' },
} as const

/** Health Lineage page headings and table heads (prototype lines 748–776). */
export const LINEAGE_COPY = {
  strengthMeta: 'Guideline-based',
  screeningHead: ['Check', 'Interval', 'Due', ''],
  matrix: { title: 'Condition matrix', meta: 'Age at onset · blank = not affected or not shared', person: 'Person' },
  consent: { title: 'Sharing and consent', meta: 'Each person decides', shares: (person: string, column: string) => `${person} shares ${column}` },
} as const

/** Care record page headings, table heads and the follow-up copy (prototype lines 777–810). */
export const RECORD_COPY = {
  enc: {
    title: 'Encounters, 2023–2026',
    ariaLabel: '46 encounters from 2023 to 2026 across GP, specialist, pathology, emergency and hearing',
    now: 'now',
  },
  medicines: { title: 'Medicines', head: ['Medicine', '30-day', 'Last'], allergy: 'Allergy' },
  labs: { title: 'Pathology trends', meta: 'Last 4 results · reference range shaded' },
  hospitals: {
    title: 'Hospital readiness',
    meta: 'Ranked for a suspected stroke',
    head: ['Hospital', 'Capability', 'ETA', 'ED load'],
    recommended: 'Recommended',
    packet: 'Preview the pre-arrival packet',
    packetTitle: 'Pre-arrival packet',
  },
  sources: { title: 'Data sources', meta: 'Provenance for every record', head: ['Source', 'Standard', 'Records', 'Last sync', 'Status'] },
  followUp: { title: 'After a hospital stay', meta: '30-day follow-up plan' },
} as const

/** Hospital view headings, legends, toasts and drawers (prototype lines 999–1062, 1700–1732, 1847–1851). */
export const HOSPITAL_COPY = {
  ed: {
    inbox: { title: 'Pre-arrival inbox', meta: 'Packets arrive before the ambulance', newPill: '1 new', newTag: 'New' },
    incoming: { title: 'Incoming ambulances', meta: 'Next 60 minutes', head: ['ETA', 'Patient', 'Presenting', 'Triage', 'Packet', 'Bed'] },
    packet: { title: 'Packet', meta: 'Select a patient', demoMeta: 'Margaret C., 78' },
    pathway: { title: 'Stroke pathway', meta: 'Treatment window', pending: 'pending' },
    page: { label: 'Page stroke team', toast: 'Stroke team paged · CT 2 on hold' },
    divert: { label: 'Divert', toast: 'Diversion suggested to the ambulance' },
  },
  panel: {
    table: {
      title: 'Older patients in the catchment',
      meta: 'Enrolled in No One Alone · ranked by 30-day admission risk',
      head: ['Patient', 'Suburb', '30-day admission', 'Main driver', 'Last ED', 'GP', 'Signal'],
    },
    scatter: {
      title: 'Risk vs age',
      ariaLabel: 'Scatter of 30-day admission risk against age; risk rises with age; Margaret at 22% aged 78',
      legend: [{ color: '#d9443f', label: 'High' }, { color: '#c88a05', label: 'Medium' }, { color: '#1fb39c', label: 'Low' }],
    },
  },
  demand: {
    forecast: {
      title: 'Presentations aged 75+, next 14 days',
      tag: 'FORECAST',
      ariaLabel: 'Forecast presentations aged 75 plus: 34 on Thursday and 31 on Friday, above the 28 comfort line',
      legend: [
        { color: '#2f6fb0', label: 'Forecast' },
        { color: 'rgba(47,111,176,.15)', label: '80% interval' },
        { color: '#56706e', label: 'Last year' },
        { color: '#d9443f', label: 'Above comfort line' },
      ],
      heatwave: 'heatwave',
      secondSpell: '2nd hot spell?',
    },
    beds: { title: 'Beds right now', meta: '15:00' },
    shap: { title: "What drives Thursday's spike", meta: 'Contribution to forecast' },
    actions: { title: 'Suggested actions', meta: 'Generated from the forecast' },
  },
  discharge: {
    board: {
      title: '30-day follow-up board',
      meta: 'Agent calls each patient in their language · warning signs go to the discharge nurse',
      head: ['Patient', 'Discharged', 'Diagnosis', 'Day 1', 'Day 3', 'Day 7', 'Day 14', 'Day 30', 'Readmission risk'],
      legend: [
        { color: '#1fb39c', label: 'Done, fine' },
        { color: '#c88a05', label: 'Done, flag raised' },
        { color: '#d9443f', label: 'Escalated to nurse' },
        { color: 'var(--track)', label: 'Upcoming' },
      ],
    },
  },
  /** Hospital-view drawers (line 1847, and the `.kpi` / `.mini` branches of the click handler). */
  actions: {
    row: [
      ['Open full chart', 'Chart opened in the EMR (demo)', 'Opened'],
      ['Message GP', 'Secure message sent to GP', 'Sent'],
      ['Assign to me', 'Assigned to you', 'Assigned'],
    ],
    kpi: [['Add to watchlist', 'Added to your watchlist', 'Watching'], ['Export CSV', 'Export queued', 'Exported']],
    mini: [['Flag for review', 'Flagged', 'Flagged'], ['Assign to me', 'Assigned to you', 'Assigned']],
  },
} as const satisfies Record<string, unknown>

/** Community view headings, legends, toasts and drawers (prototype lines 846–912, 1064–1090, 1526–1531, 1741–1742, 1851). */
export const COMMUNITY_COPY = {
  overview: {
    district: {
      ariaLabel: '3D column map of 15 Inner West suburbs',
      group: 'District metric',
      buttons: { high: 'High risk', alone: 'Living alone', heat: 'Heat', gap: 'Visit gap' },
      chips: ['Drag to turn', 'Tap a column for detail', 'Data refreshed 15:00'],
    },
    heatwave: { title: 'Heatwave plan', schedule: 'Schedule all check-ins', scheduled: '✓ 318 scheduled' },
    visits: {
      title: 'Who needs a visit this week',
      meta: 'Ranked by risk · in their language',
      head: ['Person', 'Suburb', 'Risk', 'Main reason', 'Language', 'Nearest help', ''],
      plan: 'Plan visit',
      planned: '✓ Planned',
      toast: (name: string) => `Visit planned for ${name}`,
    },
    funnel: { title: 'Alert funnel', meta: 'Last 7 days' },
    capacity: {
      title: 'Volunteer capacity vs need',
      meta: 'Visits per week',
      legend: [
        { color: 'rgba(31,179,156,.35)', label: 'Capacity' },
        { color: '#ef4e4a', label: 'Need over capacity' },
        { color: '#0b7f71', label: 'Need covered' },
      ],
    },
    edForecast: { title: 'Emergency demand forecast' },
    languages: { title: 'Languages', meta: 'Preferred language vs agent voice support' },
    programs: { title: 'Programs and outcomes', meta: '12-week view', head: ['Program', 'Regulars', 'Attendance', 'Outcome'] },
    watch: { title: 'Neighbourhood watch', meta: 'This week', open: 'Open neighbourhood watch' },
  },
  watch: {
    reports: {
      title: 'Neighbourhood watch across the Inner West',
      meta: 'Reports from residents, council, police and the agent',
      head: ['Report', 'Suburbs', 'Type', 'People affected', 'Since', 'Status'],
    },
    scams: {
      title: 'Scam contacts reported by residents',
      meta: 'Last 8 weeks',
      ariaLabel: 'Scam contacts reported per week over 8 weeks, rising to 37 this week driven by door-to-door reports',
      thisWeek: 'this wk',
    },
    feed: { title: 'Feed for community staff', meta: 'Auto-summarised · source shown' },
    callouts: { title: 'Volunteer call-outs', meta: 'Open requests', toast: 'Accepted · added to your roster', done: '✓ Accepted' },
  },
  /** Community branch of the click handler (lines 1838–1851): [label, toast, done]. */
  actions: {
    row: [['Plan a visit', 'Visit planned', 'Planned'], ['Call in their language', 'Call scheduled with interpreter voice', 'Scheduled']],
    kpi: [['Add to watchlist', 'Added to your watchlist', 'Watching'], ['Export CSV', 'Export queued', 'Exported']],
    mini: [['Flag for review', 'Flagged', 'Flagged'], ['Assign to me', 'Assigned to you', 'Assigned']],
    news: [['Send to residents', 'Queued for voice broadcast', 'Queued'], ['Dismiss', 'Dismissed', 'Dismissed']],
  },
} as const satisfies Record<string, unknown>
