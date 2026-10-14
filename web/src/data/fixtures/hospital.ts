import type {
  DischargeRow, HospitalAction, HospitalData, LabelValue, PanelRow, ScatterPoint,
} from '../types'
import { kpi, mini, type KpiRow, type MiniRow } from './helpers'
import { rng } from './rng'

/**
 * PACKET (prototype line 1513) after the two edits on lines 1875–1876: a
 * `Patient` row is added first and the `History` row is replaced.
 */
const packet: LabelValue[] = [
  ['Patient', 'Female, 78 · DOB 03/03/1948 · 162 cm, 61 kg · O+'],
  ['Status', 'Suspected stroke · ETA 14 min'],
  ['Last well', '01:55, from wearable movement'],
  ['Vitals', 'Heart rate 142 · BP 168/96 at 02:06'],
  ['History', 'HTN (2009), CKD 3a (eGFR 58), presbycusis, knee OA, osteopenia; ?paroxysmal AF under review'],
  ['Medicines', 'Amlodipine 5 mg, aspirin 100 mg, atorvastatin 20 mg'],
  ['Allergy', 'Penicillin'],
  ['Function', 'Lives alone, independent · baseline memory normal'],
  ['Comms', 'Hard of hearing: write questions down'],
  ['On scene', 'David Hughes (brother)'],
]

/** `#panelRows` (line 1711) plus the sex suffix added on line 1877. */
const panelRows: PanelRow[] = (
  [
    ['Eleni P.', 84, 'F', 'Marrickville', '31%', 'bad', 'Heart failure: +2.1 kg in 72 h', '12 Sep', 'Dr Nikolaidis', 'Weight'],
    ['Beatrice K.', 91, 'F', 'Stanmore', '28%', 'bad', 'COPD, SpO₂ 91% at rest', '2 Oct', 'Dr Hart', 'SpO₂'],
    ['Kostas P.', 82, 'M', 'Dulwich Hill', '26%', 'bad', 'Chest pain, seen last night', '13 Oct', 'Dr Patel', 'ED'],
    ['Maria S.', 86, 'F', 'Petersham', '24%', 'bad', '2 falls in 30 days', '28 Sep', 'Dr Silva', 'Gait'],
    ['Margaret C.', 78, 'F', 'Marrickville', '22%', 'warn', 'BP rising, missed doses', 'Mar 2025', 'Dr Patel', 'BP'],
    ['Nguyen Van T.', 81, 'M', 'Tempe', '19%', 'warn', 'Heat, no air-con', '—', 'Dr Le', 'Heat'],
    ['Giuseppe R.', 88, 'M', 'Leichhardt', '17%', 'warn', 'Night wandering', 'Jul', 'Dr Russo', 'Motion'],
    ['Fatima A.', 79, 'F', 'Lewisham', '12%', 'plain', 'Hearing, missed check-ins', '—', 'Dr Haddad', 'Voice'],
    ['Wei L.', 77, 'F', 'Ashfield', '9%', 'plain', 'Low mood 3 weeks', '—', 'Dr Chen', 'Mood'],
    ['Peter H.', 80, 'M', 'Newtown', '8%', 'plain', 'New sleeping tablet', '—', 'Dr Hart', 'Meds'],
  ] as const
).map(([name, age, sex, suburb, risk, tone, driver, lastEd, gp, signal]) => ({
  name, age, sex, suburb, risk, tone, driver, lastEd, gp, signal,
}))

/** Risk-vs-age scatter (lines 1712–1717), seed 21: 120 sample patients. */
function buildScatter(): ScatterPoint[] {
  const R = rng(21)
  const pts: ScatterPoint[] = []
  for (let i = 0; i < 120; i++) {
    const age = 70 + R() * 25
    const risk = Math.max(1, Math.min(39, 2 + (age - 70) * 0.55 + (R() - 0.4) * 14))
    pts.push({ age, risk })
  }
  return pts
}

/** `#actionsH` (line 1729). */
const actions: HospitalAction[] = (
  [
    ['Open 6 surge beds in short stay', 'Thu 10:00–22:00 · covers the forecast gap of 6', 'Approve'],
    ['Add a geriatrician and 2 nurses to ED', 'Thu and Fri afternoon', 'Approve'],
    ['Ask community health to run heat check-ins', '318 residents · already scheduled', 'Linked'],
    ['Bring forward 4 discharges to Wednesday evening', 'Patients ready, transport booked by volunteers', 'Review'],
    ['Tell the ambulance service about Thursday load', 'Automatic at 07:00 Thursday', 'Auto'],
  ] as const
).map(([title, note, button]) => ({ title, note, button }))

/** `#board` (line 1732): [patient, discharged, diagnosis, day 1/3/7/14/30, risk, tone]. */
const board: DischargeRow[] = (
  [
    ['Joan W., 88', '13 Oct', 'Hip fracture, repaired', ['ok', 'up', 'up', 'up', 'up'], '18%', 'warn'],
    ['Kostas P., 82', '13 Oct', 'Chest pain, ruled out', ['ok', 'up', 'up', 'up', 'up'], '9%', 'plain'],
    ['Robert M., 79', '10 Oct', 'Pneumonia', ['ok', 'fl', 'up', 'up', 'up'], '21%', 'bad'],
    ['Anh N., 83', '7 Oct', 'Heart failure', ['ok', 'ok', 'es', 'up', 'up'], '27%', 'bad'],
    ['Dorothy F., 90', '2 Oct', 'Delirium, UTI', ['ok', 'ok', 'ok', 'up', 'up'], '14%', 'warn'],
    ['Sami H., 76', '28 Sep', 'Stroke (minor)', ['ok', 'ok', 'fl', 'ok', 'up'], '11%', 'plain'],
    ['Lucia B., 84', '22 Sep', 'Fall, wrist', ['ok', 'ok', 'ok', 'ok', 'up'], '7%', 'good'],
    ['Henry T., 81', '15 Sep', 'COPD flare', ['ok', 'ok', 'ok', 'fl', 'ok'], '12%', 'plain'],
  ] as const
).map(([patient, discharged, diagnosis, days, risk, tone]) => ({
  patient, discharged, diagnosis, days: [...days] as DischargeRow['days'], risk, tone,
}))

export const hospital: HospitalData = {
  context: {
    initials: 'CS',
    color: '#2563a8',
    sub: 'Emergency department · stroke unit · catchment 1,846 enrolled older residents',
    facts: [
      { live: true, label: 'Live', value: '15:10' },
      { live: false, label: 'ED', value: '38/42' },
      { live: false, label: 'Stroke unit', value: '11/12' },
      { live: false, label: 'Heatwave', value: 'Thursday' },
    ],
  },
  edKpis: (
    [
      ['Pre-arrival packets', '6', 'today', '#2563a8', '41 this month', '+12% mo', '', [2, 3, 3, 4, 4, 5, 5, 6, 6]],
      ['Notice before arrival', '14', 'min median', '#2563a8', 'p90 22 min', '+3 min', '', [9, 10, 11, 11, 12, 13, 13, 14, 14]],
      ['Door to CT (stroke)', '19', 'min median', '#1f8f5f', 'was 26 before', '−7 min', '', [27, 26, 25, 24, 23, 22, 21, 20, 19]],
      ['Aged 75+ in ED now', '4', 'patients', '#c88a05', '2 with packets', '', '', [2, 3, 3, 4, 5, 4, 4, 4, 4]],
      ['Ambulances inbound', '3', 'next 60 min', '#d9443f', '1 stroke call', '', 'warn', [1, 2, 1, 2, 3, 2, 2, 3, 3]],
      ['Allergy known on arrival', '100', '%', '#1f8f5f', 'packet patients', 'vs 62% without', '', [60, 70, 80, 90, 95, 100, 100, 100, 100]],
    ] satisfies KpiRow[]
  ).map(kpi),
  // INBOX (line 1532).
  inbox: [
    { name: 'Kostas P., 82', summary: 'Chest pain · arrived 23:40', pill: { tone: 'plain', text: 'Seen' } },
    { name: 'Joan W., 88', summary: 'Fall, hip pain · arrived 21:15', pill: { tone: 'plain', text: 'Seen' } },
  ],
  inboxArchivedNote: 'Handled. Packet archived.',
  // renderED (line 1701).
  incoming: [
    { eta: '22 min', patient: 'Beatrice K., 91 · enrolled', presenting: 'Breathless, SpO₂ 89%', triage: 'Cat 2', triageTone: 'warn', packet: true, bed: 'Resus 4' },
    { eta: '31 min', patient: 'Unknown male, ~60s', presenting: 'Chest pain', triage: 'Cat 2', triageTone: 'warn', packet: false, bed: 'Acute 6' },
    { eta: '48 min', patient: 'Unknown female, ~40s', presenting: 'Abdominal pain', triage: 'Cat 3', triageTone: 'plain', packet: false, bed: 'Acute 9' },
  ],
  incomingDemo: { eta: '14 min', patient: 'Margaret C., 78 · enrolled', presenting: 'Suspected stroke · last well 01:55', triage: 'Cat 2', triageTone: 'bad', packet: true, bed: 'Resus 2' },
  inboxDemo: {
    name: 'Margaret C., 78',
    summary: 'Suspected stroke · ETA 14 min',
    summaryArriving: 'Suspected stroke · ETA arriving now',
  },
  packet,
  examplePacket: {
    patient: 'Beatrice K., 91 (example)',
    rows: [
      ['Status', 'Breathless, SpO₂ 89% · ETA 22 min'],
      ['History', 'COPD, heart failure'],
      ['Medicines', 'Tiotropium, furosemide 40 mg'],
      ['Note', "Run the night alert demo to watch Margaret's packet arrive."],
    ],
  },
  pathway: [
    { text: 'Packet received', note: '02:07', doneFromStep: 7 },
    { text: 'Last known well confirmed (01:55)', note: 'wearable', doneFromStep: 7 },
    { text: 'Allergy checked: penicillin', note: 'auto', doneFromStep: 7 },
    { text: 'Anticoagulants: none (aspirin only)', note: 'auto', doneFromStep: 7 },
    { text: 'CT 2 reserved', note: '02:12', doneFromStep: 8 },
    { text: 'Stroke team paged', note: '02:13', doneFromStep: 8 },
    { text: 'Hearing: write questions down', note: 'note', doneFromStep: 7 },
    { text: 'Family contact: David on scene', note: '02:11', doneFromStep: 8 },
  ],
  pathwayWindow: { demo: 'Window closes 06:25 · 4 h 18 min left', idle: 'Select a stroke packet' },
  panel: {
    kpis: (
      [
        ['Enrolled patients', '1,846', '', '#2563a8', '15 suburbs', '+64 mo', '', [1600, 1650, 1700, 1740, 1770, 1800, 1820, 1835, 1846]],
        ['High 30-day admission risk', '74', 'patients', '#d9443f', '4% of panel', '+9 wk', 'warn', [60, 62, 63, 65, 66, 68, 70, 72, 74]],
        ['Discharged, last 30 days', '61', '', '#2563a8', 'all followed up', '', '', [50, 52, 55, 57, 58, 60, 61, 61, 61]],
        ['ED visits avoided (est.)', '23', 'this quarter', '#1f8f5f', 'by early action', '+5', '', [5, 8, 10, 13, 15, 17, 19, 21, 23]],
        ['Packets used', '41', 'this month', '#8f6fd0', '100% with meds list', '', '', [20, 24, 27, 30, 33, 35, 38, 40, 41]],
        ['Consent to share', '88', '%', '#1f8f5f', 'hospital level', '+3 pts', '', [80, 82, 83, 84, 85, 86, 87, 88, 88]],
      ] satisfies KpiRow[]
    ).map(kpi),
    rows: panelRows,
    scatter: buildScatter(),
    scatterMeta: '1,846 patients · sample of 120 shown',
    scatterNote: 'Clinicians see named patients only where the patient consented to hospital sharing.',
    highlight: { age: 78, risk: 22, label: 'Margaret' },
  },
  demand: {
    days: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'],
    forecast: [21, 34, 31, 25, 22, 20, 21, 22, 23, 24, 22, 21, 26, 29],
    lastYear: [20, 22, 21, 23, 21, 19, 20, 21, 22, 22, 21, 20, 21, 22],
    comfortLine: 28,
    meta: 'Model: heat index, day of week, flu activity, last 3 years',
    beds: [
      { ward: 'ED cubicles', used: 38, total: 42 },
      { ward: 'Stroke unit', used: 11, total: 12 },
      { ward: 'Geriatric ward', used: 27, total: 28 },
      { ward: 'Short stay', used: 14, total: 20 },
      { ward: 'ICU', used: 9, total: 12 },
    ],
    bedsMinis: (
      [
        ['ED waiting', '18', '4 aged 75+'],
        ['Access block', '6', '> 8 h'],
        ['Discharges', '23', 'expected today'],
      ] satisfies MiniRow[]
    ).map(mini),
    drivers: [
      { label: 'Heat index 38°', value: 8.1 },
      { label: 'Day of week (Thu)', value: 1.2 },
      { label: 'Pollen, storm asthma', value: 1.6 },
      { label: 'Community heat check-ins', value: -2.4 },
      { label: 'Flu activity low', value: -0.8 },
      { label: 'Cool rooms open', value: -1.1 },
    ],
    actions,
  },
  discharge: {
    kpis: (
      [
        ['Discharged, 30 days', '61', 'patients', '#2563a8', 'aged 70+', '', '', [40, 44, 48, 52, 55, 57, 59, 60, 61]],
        ['Calls completed', '92', '%', '#1f8f5f', 'in 6 languages', '+4 pts', '', [80, 83, 85, 87, 88, 90, 91, 92, 92]],
        ['Flags raised', '14', '', '#c88a05', 'pain, confusion, meds', '', 'warn', [8, 9, 10, 11, 12, 13, 13, 14, 14]],
        ['Escalated to nurse', '5', '', '#d9443f', 'all reviewed < 2 h', '', '', [2, 2, 3, 3, 4, 4, 5, 5, 5]],
        ['Readmitted', '6.6', '%', '#1f8f5f', 'baseline 11.2%', '−4.6 pts', '', [11.2, 10.5, 9.8, 9, 8.4, 7.8, 7.2, 6.9, 6.6]],
        ['Avg call length', '3:40', 'min', '#8f6fd0', 'voice agent', '', '', [3, 3.2, 3.4, 3.5, 3.6, 3.6, 3.7, 3.7, 3.7]],
      ] satisfies KpiRow[]
    ).map(kpi),
    board,
  },
}
