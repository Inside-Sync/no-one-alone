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
