import type { Condition, DayLineEntry, HelperLogEntry, OwnView, Person, ProfileRow } from '../types'
import { kpi, plainKpi, type KpiRow, type PlainKpiRow } from './helpers'

/** CONDS (prototype line 1864): [emoji, title, since, now, colour, detail]. */
const conditions: Condition[] = (
  [
    ['🩺', 'High blood pressure', 'Since age 61 (2009)', 'Not well controlled lately', '#d9443f', 'Her blood pressure has crept up over 6 weeks. She takes amlodipine each evening; 3 doses were missed this week. Target: under 135 in the morning.'],
    ['🦻', 'Hearing loss', 'Both ears · since 72 (2020)', 'Aids not worn today', '#c88a05', 'Age-related hearing loss. Hearing aids help, and wearing them also lowers the chance of memory problems later. Hearing test booked 22 Oct.'],
    ['🫘', 'Kidneys working a bit slower', 'Stage 3a · found 2025', 'Stable, check yearly', '#c88a05', 'Kidney function (eGFR) is 58; normal is 60 or above. Common at her age. Her GP checks it yearly and avoids medicines that strain the kidneys.'],
    ['🍬', 'Blood sugar at the high end', 'HbA1c 5.9% · 2026', 'Watch', '#c88a05', 'Not diabetes, but close to the line (6.0%). Her father had type 2 diabetes. Walking and fewer sweet drinks help.'],
    ['🦴', 'Arthritis in both knees', 'Since 2015', 'Mild pain, uses a stick', '#56706e', 'Wear-and-tear arthritis. Gentle walking and the strength class help. Paracetamol when needed.'],
    ['💔', 'Uneven heartbeat (possible)', 'Being checked · Oct 2026', '2 alerts this week', '#c2417a', 'Her watch flagged an uneven rhythm twice at night. Her heart tracing on 12 Oct was normal. Her GP may order a 2-week heart monitor.'],
    ['🧠', 'Memory', 'No diagnosis', 'Watching gently', '#1f8f5f', 'No memory condition. Her mother had dementia, so the daily chat looks for slow changes in speech. All normal so far.'],
    ['🦴', 'Bone strength', 'Osteopenia · 2022', 'Vitamin D daily', '#56706e', 'Bones a little thinner than average, which is common after 70. She takes vitamin D and does balance exercises to prevent falls.'],
  ] as const
).map(([emoji, title, since, now, color, detail]) => ({ emoji, title, since, now, color, detail }))

/** `#profile` .pf-grid, in order. */
const profileRows: ProfileRow[] = [
  { emoji: '👩', label: 'Gender', value: 'Female' },
  { emoji: '🎂', label: 'Age', value: '78' },
  { emoji: '📏', label: 'Height', value: '162 cm' },
  { emoji: '⚖️', label: 'Weight', value: '61.2 kg' },
  { emoji: '📐', label: 'BMI', value: '23.4 · healthy' },
  { emoji: '🩸', label: 'Blood type', value: 'O positive' },
  { emoji: '🏠', label: 'Lives', value: 'Alone · 2-storey terrace' },
  { emoji: '🗣️', label: 'Language', value: 'English' },
  { emoji: '🦯', label: 'Mobility aid', value: 'Walking stick outdoors' },
  { emoji: '👓', label: 'Vision', value: 'Reading glasses' },
  { emoji: '🦻', label: 'Hearing', value: 'Aids, both ears' },
  { emoji: '📝', label: 'Care wishes', value: 'Advance care plan on file' },
]

/** DAY (line 1404): [time, text, flag]. */
const dayline: DayLineEntry[] = (
  [
    ['Morning', '🌅 Up and about · said good morning', ''],
    ['08:12', '💬 Morning chat · all well', ''],
    ['08:31', '💊 Morning tablets taken', ''],
    ['09:31', "💊 Last night's tablet taken after a reminder", 'w'],
    ['Late morning', '🚶 Went out for a walk', ''],
    ['13:02', '🍽️ Lunch chat · cheerful', ''],
    ['Afternoon', "😴 Having a rest · it's warm today", 'w'],
    ['18:00', '💬 Next chat', 'n'],
  ] as const
).map(([time, text, flag]) => (flag ? { time, text, flag } : { time, text }))

/** KP (line 1406): the original technical tiles. */
const kpisTechnical = (
  [
    ['Resting heart rate', '68', 'bpm', '#ef6a5e', 'base 63', '+0.4σ', '', [62, 63, 64, 63, 65, 64, 66, 64, 68]],
    ['Blood pressure (7 d)', '146', '/88', '#c88a05', 'base 132/82', '+2.8σ', 'warn', [128, 130, 131, 133, 135, 137, 140, 143, 146]],
    ['HRV (RMSSD)', '26', 'ms', '#5a7fe0', 'base 31', '−1.9σ', 'warn', [32, 31, 30, 31, 29, 28, 27, 27, 26]],
    ['Sleep', '6:12', 'h', '#8f6fd0', 'eff 81%', '−1.2σ', 'warn', [7.1, 6.9, 7.0, 6.6, 6.8, 6.3, 6.5, 6.0, 6.2]],
    ['Steps', '3,240', 'today', '#1fb39c', 'base 3,600', '−0.6σ', '', [3800, 3500, 3900, 3400, 3600, 3300, 3700, 3100, 3240]],
    ['Gait speed', '0.82', 'm/s', '#1f8f5f', 'base 0.89', '−2.1σ', 'warn', [0.9, 0.89, 0.9, 0.88, 0.87, 0.86, 0.85, 0.83, 0.82]],
    ['Medication adherence', '86', '% 30 d', '#c88a05', 'target 95', '−1.8σ', 'warn', [97, 96, 95, 94, 92, 90, 89, 87, 86]],
    ['Check-in response', '97', '% 30 d', '#0b7f71', 'base 98', '−0.3σ', '', [98, 99, 97, 98, 98, 96, 97, 98, 97]],
    ['Speech rate', '132', 'wpm', '#2f6fb0', 'base 141', '−1.4σ', '', [142, 140, 141, 139, 138, 137, 135, 134, 132]],
    ['Social contacts', '5', 'this week', '#c2417a', 'base 6', '−0.5σ', '', [6, 7, 6, 5, 6, 6, 5, 5, 5]],
    ['Indoor temperature', '29.5', '°C', '#e07a3f', 'base 25.1', '+2.2σ', 'warn', [24, 25, 25, 26, 27, 27, 28, 29, 29.5]],
    ['Body weight', '61.2', 'kg', '#56706e', 'base 61.0', '+0.2σ', '', [61, 61.1, 60.9, 61, 61.2, 61.1, 61, 61.3, 61.2]],
  ] satisfies KpiRow[]
).map(kpi)

/** Plain-language KPI tiles (line 1776), the version the individual view shows. */
const kpis = (
  [
    ['❤️', 'Heart rate', '68', 'bpm', '#ef6a5e', 'usual 63', 'A bit higher', '', [62, 63, 64, 63, 65, 64, 66, 64, 68]],
    ['🩺', 'Blood pressure', '146', '/88', '#c88a05', 'usual 132/82', 'Higher than usual', 'warn', [128, 130, 131, 133, 135, 137, 140, 143, 146]],
    ['🌿', 'Calm score (HRV)', '26', '', '#5a7fe0', 'usual 31', 'Lower: more strain', 'warn', [32, 31, 30, 31, 29, 28, 27, 27, 26]],
    ['😴', 'Sleep', '6h 12m', '', '#8f6fd0', 'usual 7h', 'Less than usual', 'warn', [7.1, 6.9, 7.0, 6.6, 6.8, 6.3, 6.5, 6.0, 6.2]],
    ['👣', 'Steps', '3,240', 'today', '#1fb39c', 'usual 3,600', 'About usual', '', [3800, 3500, 3900, 3400, 3600, 3300, 3700, 3100, 3240]],
    ['🚶', 'Walking speed', '0.82', 'm/s', '#1f8f5f', 'usual 0.89', 'Slower than usual', 'warn', [0.9, 0.89, 0.9, 0.88, 0.87, 0.86, 0.85, 0.83, 0.82]],
    ['💊', 'Tablets taken', '86', '%', '#c88a05', 'goal 95%', 'Some missed', 'warn', [97, 96, 95, 94, 92, 90, 89, 87, 86]],
    ['📞', 'Calls answered', '97', '%', '#0b7f71', 'usual 98%', 'As usual', '', [98, 99, 97, 98, 98, 96, 97, 98, 97]],
    ['🗣️', 'Speaking pace', '132', 'words/min', '#2f6fb0', 'usual 141', 'A bit slower', '', [142, 140, 141, 139, 138, 137, 135, 134, 132]],
    ['🤝', 'Time with people', '5', 'this week', '#c2417a', 'usual 6', 'About usual', '', [6, 7, 6, 5, 6, 6, 5, 5, 5]],
    ['🌡️', 'Home temperature', '29.5', '°C', '#e07a3f', 'usual 25', 'Too warm', 'warn', [24, 25, 25, 26, 27, 27, 28, 29, 29.5]],
    ['⚖️', 'Weight', '61.2', 'kg', '#56706e', 'usual 61.0', 'Steady', '', [61, 61.1, 60.9, 61, 61.2, 61.1, 61, 61.3, 61.2]],
  ] satisfies PlainKpiRow[]
).map(plainKpi)

/** `#audit` plain version (prototype line 1803): [time, what, how, why, result, tone]. */
const helperLog: HelperLogEntry[] = (
  [
    ['15:00', 'Re-checked all her health signs', 'Did it', 'Every hour', 'Stroke chance unchanged', 'plain'],
    ['13:02', 'Had a 2-minute chat with her', 'Did it', 'Daily call', 'Clear speech · said "pardon?" twice', 'good'],
    ['12:40', 'Reminded her to put the fan on and drink water', 'Did it', 'Home is 29.5°', 'She said "will do, love"', 'good'],
    ['10:05', "Reminded her about Thursday's walking group", 'Did it', 'She asked to be reminded', "She said she'll go", 'good'],
    ['09:31', "Followed up last night's missed tablet", 'Did it', 'Pill box not opened', 'Taken at 9:33', 'good'],
    ['08:12', 'Morning chat', 'Did it', 'Daily call', 'All well', 'good'],
    ['Yesterday 21:40', 'Suggested David sets up a weekly pill box', 'Needs your OK', 'Missed tablets + rising BP', 'Waiting for you', 'warn'],
    ['Yesterday 16:00', 'Sent her blood pressure report to Dr Patel', 'You approved', 'Weekly summary', 'Delivered · read 4:42 pm', 'good'],
  ] as const
).map(([time, what, how, why, result, tone]) => ({ time, what, how, why, result, tone, needsApproval: how === 'Needs your OK' }))

/** `#audit` original technical version (prototype line 1442). */
const helperLogTechnical: HelperLogEntry[] = (
  [
    ['15:00', 'Re-scored all risks (64 signals)', 'Autonomous', 'Scheduled', 'Stroke 90 d unchanged at 2.1%', 'plain'],
    ['13:02', 'Voice check-in, 2 min 14 s', 'Autonomous', 'Daily schedule', 'Speech clear · "pardon?" ×2', 'good'],
    ['12:40', 'Heat reminder: fan on, drink water', 'Autonomous', 'Indoor 29.5 °C', 'Acknowledged by voice', 'good'],
    ['10:05', 'Pharmacy visit detected (10:14–10:22)', 'Passive', 'Geofence', 'Normal routine', 'plain'],
    ['09:31', 'Missed-dose follow-up', 'Autonomous', 'Pill box: dose not taken', 'Taken at 09:33', 'good'],
    ['08:12', 'Morning check-in', 'Autonomous', 'Daily schedule', 'Clear', 'good'],
    ['Yesterday 21:40', 'Suggested pill box set-up by David', 'Needs approval', 'BP trend + missed doses', 'Waiting for James', 'warn'],
    ['Yesterday 16:00', 'BP report sent to Dr Patel', 'Approved by James', 'Weekly summary', 'Delivered · read 16:42', 'good'],
  ] as const
).map(([time, what, how, why, result, tone]) => ({ time, what, how, why, result, tone, needsApproval: how === 'Needs approval' }))

/** Margaret's own app (`meMain` / `prMain`, lines 1911–1969, 1980). */
const ownView: OwnView = {
  greeting: 'Good afternoon, Maggie 🌞',
  sub: "You're doing well today. Here's your day, just for you.",
  tiles: [
    { emoji: '❤️', title: 'Heart', note: '68 · steady' },
    { emoji: '👣', title: '3,240 steps', note: 'nearly at 3,500!' },
    { emoji: '😴', title: '6 h sleep', note: 'a bit short', warn: true },
    { emoji: '💧', title: 'Water', note: 'have a glass now', warn: true },
    { emoji: '💊', title: 'Next tablet', note: '6 pm, amlodipine' },
    { emoji: '📞', title: 'James calls', note: 'tonight at 8 pm' },
  ],
  ideas: [
    {
      emoji: '🔥',
      title: 'Thursday will be 38°. Would you like a lift to the library cool room?',
      note: 'Tom, a volunteer, can pick you up at 11.',
      yes: { label: 'Yes please', toast: 'Lift booked for Thursday 11:00', done: 'Booked' },
      no: { label: 'No thanks', toast: "No problem, we'll check in by phone instead", done: 'Not now' },
    },
    {
      emoji: '💊',
      title: 'Would a weekly pill box help with the evening tablet?',
      note: 'David offered to set it up on Saturday.',
      yes: { label: 'Yes please', toast: 'David will come Saturday 10:00', done: 'Yes' },
      no: { label: 'No thanks', toast: "Okay, we'll keep the reminder only", done: 'Not now' },
    },
    {
      emoji: '🦻',
      title: "Pop your hearing aids in for this afternoon's chat?",
      note: 'It makes the calls easier.',
      yes: { label: 'Done', toast: 'Lovely', done: 'Done' },
      no: { label: 'Later', toast: "That's fine", done: 'Later' },
    },
  ],
  promise: [
    { emoji: '✋', lead: "You're in charge.", text: 'You decide who sees what, and you can change it any time.' },
    { emoji: '📷', lead: 'No cameras, ever.', text: 'Home sensors only notice movement and temperature.' },
    { emoji: '🎙️', lead: 'No listening in.', text: 'The microphone is only on during calls you answer.' },
    { emoji: '📍', lead: 'No tracking.', text: 'Location is off. If you turn it on, people only see "home" or "out".' },
    { emoji: '🚨', lead: 'Emergencies only:', text: 'David and James always get safety alerts, so help can come.' },
  ],
  accessLog: [
    { when: 'Today 09:12', who: 'James', what: 'Your heart and blood pressure summary', why: 'Weekly look' },
    { when: 'Today 08:40', who: 'David', what: '"I\'m OK" check-in', why: 'Morning check' },
    { when: 'Yesterday 16:42', who: 'Dr Patel', what: 'Blood pressure report', why: 'You agreed to send it' },
    { when: 'Yesterday 11:05', who: 'Priya', what: 'Tablets taken this week', why: 'Nurse visit planning' },
    { when: 'Mon 19:30', who: 'Sarah', what: 'Sleep and steps', why: 'Called you afterwards' },
  ],
  privacy: {
    presets: [
      { id: 'family', label: '👨‍👩‍👧 Family sees most, not my mood' },
      { id: 'safety', label: '🚨 Safety alerts only' },
      { id: 'all', label: '🤝 Share everything with family' },
    ],
    safetyNote:
      "🚨 Safety alerts can't be turned off for your emergency contacts, so someone can always come if you need help. You can change who your emergency contacts are.",
    emergency: {
      agreed: 'Agreed 1 October',
      text: 'If you need an ambulance, the hospital receives your conditions, tablets and allergy, so they can help quickly. Nothing else, and only for that visit.',
      buttons: [
        { label: 'Read the agreement', toast: 'Your emergency agreement is shown on your phone', done: 'Opened' },
        { label: 'Emergency contacts', toast: 'Emergency contacts: David and James', done: 'Checked' },
      ],
    },
  },
}

export const margaret: Person = {
  id: 'margaret',
  name: 'Margaret Collins',
  initials: 'MC',
  color: '#0b7f71',
  nickname: 'Maggie',
  born: '3 March 1948',
  age: 78,
  gender: 'Female',
  suburb: 'Marrickville',
  postcode: '2204',
  heightCm: 162,
  weightKg: 61.2,
  bmi: 23.4,
  bloodType: 'O positive',
  mobilityAid: 'Walking stick outdoors',
  hearingAids: 'Aids, both ears',
  advanceCarePlan: 'Advance care plan on file',
  allergies: ['Penicillin'],
  medicineCount: 4,
  conditions,
  status: 'good',
  lastChat: 'Last chat 13:02 · cheerful',
  devices: { wearableBattery: 64, hubSensors: 6 },
  profile: {
    checkedBy: 'Her health profile · checked by her GP on 12 Sep',
    shareToast: 'Profile shared with the care circle',
    rows: profileRows,
    chips: [
      { text: '⚠️ Allergy: penicillin (rash)', danger: true },
      { text: '💊 4 regular medicines' },
      { text: '🚬 Never smoked' },
      { text: '🍷 1–2 drinks a week' },
      { text: '💉 Flu shot Apr 2026 · COVID due' },
    ],
  },
  today: {
    updated: 'Updated 15:08',
    headline: 'Doing well',
    devices: [
      { label: 'Wearable', value: '64% · on wrist' },
      { label: 'Home hub', value: 'Online · 6 sensors' },
      { label: 'Phone', value: 'Charging' },
    ],
    actions: [
      { label: 'Ask how she is', icon: 'mic', kind: 'chat' },
      { label: 'Call Mum', toast: 'Calling Margaret · captions on', kind: 'call' },
    ],
  },
  dayline,
  context: {
    initials: 'MC',
    color: '#0b7f71',
    sub: 'Marrickville NSW 2204 · Inner West · Wednesday 14 October, 15:10 AEDT',
    // MAR.facts after line 1874.
    facts: [
      { live: true, label: 'Female', value: '78' },
      { live: false, label: 'Born', value: '3 Mar 1948' },
      { live: false, label: 'Conditions', value: '8' },
      { live: false, label: 'Allergy', value: 'penicillin' },
      { live: false, label: 'Mode', value: 'hearing' },
      { live: false, label: 'Care team', value: '5 people' },
    ],
  },
  kpis,
  kpisTechnical,
  helperLog,
  helperLogTechnical,
  ownView,
}
