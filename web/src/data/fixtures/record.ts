import type {
  CareRecord, DataSourceRow, EncounterTrack, HospitalReadiness, LabRow, MedicineRow,
} from '../types'
import { kpi, plainKpi, type KpiRow, type PlainKpiRow } from './helpers'
import { rng } from './rng'

/** `#recKpis` technical tiles (prototype line 1497). */
const kpisTechnical = (
  [
    ['FHIR resources', '1,284', '', '#0b7f71', '6 sources', '+38 wk', '', [1100, 1130, 1160, 1190, 1210, 1230, 1250, 1270, 1284]],
    ['Encounters', '46', 'since 2023', '#1fb39c', 'GP 18 · path 14', '+2 mo', '', [30, 32, 35, 37, 39, 41, 43, 45, 46]],
    ['Active medicines', '4', '', '#c88a05', '0 interactions', 'stable', '', [4, 4, 4, 4, 4, 4, 4, 4, 4]],
    ['Pathology results', '212', '', '#5a7fe0', 'last 12 Oct', '+9 mo', '', [150, 160, 170, 180, 190, 198, 204, 210, 212]],
    ['Record completeness', '94', '%', '#8f6fd0', 'target 90', '+6 pts', '', [80, 82, 85, 87, 89, 90, 92, 93, 94]],
    ['Days since GP visit', '32', 'days', '#2f6fb0', '12 Sep', 'due 7 Nov', 'warn', [2, 10, 18, 25, 1, 8, 15, 24, 32]],
  ] satisfies KpiRow[]
).map(kpi)

/** Plain-language tiles (line 1789), the version the individual view shows. */
const kpis = (
  [
    ['📁', 'Health records', '1,284', '', '#0b7f71', 'from 6 places', '38 new this week', '', [1100, 1130, 1160, 1190, 1210, 1230, 1250, 1270, 1284]],
    ['🏥', 'Visits since 2023', '46', '', '#1fb39c', 'GP 18 · tests 14', '2 this month', '', [30, 32, 35, 37, 39, 41, 43, 45, 46]],
    ['💊', 'Medicines', '4', '', '#c88a05', 'no clashes found', 'Unchanged', '', [4, 4, 4, 4, 4, 4, 4, 4, 4]],
    ['🧪', 'Test results', '212', '', '#5a7fe0', 'latest 12 Oct', '9 this month', '', [150, 160, 170, 180, 190, 198, 204, 210, 212]],
    ['✅', 'Record complete', '94', '%', '#8f6fd0', 'goal 90%', 'Good', '', [80, 82, 85, 87, 89, 90, 92, 93, 94]],
    ['📅', 'Days since GP', '32', 'days', '#2f6fb0', 'last 12 Sep', 'Due by 7 Nov', 'warn', [2, 10, 18, 25, 1, 8, 15, 24, 32]],
  ] satisfies PlainKpiRow[]
).map(plainKpi)

/** Encounter timeline (lines 1498–1505): months since Jan 2023, seed 3. */
function buildEncounterTracks(): EncounterTrack[] {
  const R = rng(3)
  const defs: [EncounterTrack['type'], string, number][] = [
    ['GP', '#1fb39c', 18],
    ['Specialist', '#5a7fe0', 6],
    ['Pathology', '#c88a05', 14],
    ['Emergency', '#ef4e4a', 2],
    ['Hearing', '#8f6fd0', 6],
  ]
  return defs.map(([type, color, count]) => {
    const months: number[] = []
    for (let j = 0; j < count; j++) {
      months.push(
        type === 'Emergency'
          ? [14, 33][j]
          : type === 'Hearing'
            ? 28 + j * 3
            : ((j + 0.5) * 45) / count + (R() - 0.5) * 1.5,
      )
    }
    return { type, color, count, months }
  })
}

/** `#meds` (line 1506): [name, timing, adherence %, tone, last dose]. */
const medicines: MedicineRow[] = (
  [
    ['Amlodipine 5 mg', 'Evening', 82, 'warn', 'Today 09:33 (late)'],
    ['Aspirin 100 mg', 'Morning', 96, 'good', 'Today 08:31'],
    ['Atorvastatin 20 mg', 'Night', 88, 'warn', 'Yesterday 21:02'],
    ['Vitamin D 1000 IU', 'Morning', 90, 'good', 'Today 08:31'],
  ] as const
).map(([name, timing, adherence, tone, last]) => ({ name, timing, adherence, tone, last }))

/** `#labs` (line 1507): [name, unit, last 4, reference, axis low, axis high, note]. */
const labs: LabRow[] = (
  [
    ['eGFR', 'mL/min', [64, 62, 60, 58], [60, 120], [55, 70], 'Below 60 · kidney check'],
    ['HbA1c', '%', [5.6, 5.7, 5.8, 5.9], [4, 6], [5.4, 6.2], 'Rising · pre-diabetes range soon'],
    ['LDL cholesterol', 'mmol/L', [3.1, 2.6, 2.5, 2.4], [0, 2.6], [2, 3.4], 'At target'],
    ['Sodium', 'mmol/L', [139, 138, 137, 136], [135, 145], [132, 142], 'Normal, drifting down'],
  ] as const
).map(([name, unit, values, reference, axis, note]) => ({
  name, unit, values: [...values] as LabRow['values'], reference: [...reference] as LabRow['reference'], axis: [...axis] as LabRow['axis'], note,
}))

/** `#hosps` (line 1511). */
const hospitals: HospitalReadiness[] = [
  { name: 'Camperdown Stroke Centre', capability: 'Stroke unit 24/7 · clot retrieval', eta: '11 min', load: '24/28', tone: 'warn', recommended: true },
  { name: 'Inner West General', capability: 'ED · no stroke unit', eta: '9 min', load: '14/30', tone: 'good', recommended: false },
  { name: 'Kogarah Regional', capability: 'Stroke unit 24/7', eta: '17 min', load: '31/28', tone: 'bad', recommended: false },
]

/** `#srcs` (line 1512): [source, standard, records, last sync, status, tone]. */
const sources: DataSourceRow[] = (
  [
    ['Wrist wearable', 'Vendor API → FHIR Observation', '18,402', '2 min ago', 'Live', 'good'],
    ['Home hub · 6 sensors', 'MQTT → Pub/Sub → FHIR', '52,110', '1 min ago', 'Live', 'good'],
    ['Voice check-ins', 'Gemini → QuestionnaireResponse', '612', '13:04', 'Live', 'good'],
    ['Illawarra Rd Family Practice', 'FHIR R4', '386', '06:00', 'Daily', 'good'],
    ['Pathology lab', 'HL7 v2 → FHIR R4', '212', '12 Oct', 'On result', 'good'],
    ['Scanned letters and reports', 'Gemini OCR → FHIR DocumentReference', '74', '3 Sep', 'Done', 'plain'],
    ['My Health Record', 'FHIR (planned)', '—', '—', 'Planned', 'plain'],
  ] as const
).map(([source, standard, records, lastSync, status, tone]) => ({ source, standard, records, lastSync, status, tone }))

export const careRecord: CareRecord = {
  kpis,
  kpisTechnical,
  encounters: {
    meta: '46 encounters from 6 sources',
    types: buildEncounterTracks(),
    now: 45.5,
    markers: [
      { month: 14, label: 'fall · wrist' },
      { month: 33, label: 'dizziness' },
    ],
  },
  medicines,
  allergyNote: {
    allergen: 'penicillin',
    detail: 'rash, 1998',
    checked: 'Interaction check run 14 Oct against all active medicines.',
  },
  medicinesPill: { tone: 'good', text: 'No interactions' },
  labs,
  hospitals,
  sources,
  sourcesTag: 'FHIR R4',
  followUp: [
    { day: 'DAY 1', text: 'Voice call, pain and confusion check' },
    { day: 'DAY 3', text: 'New medicines matched to old' },
    { day: 'DAY 7', text: 'GP visit booked, BP review' },
    { day: 'DAY 14', text: 'Mobility and falls check' },
    { day: 'DAY 30', text: 'Readmission risk re-scored' },
  ],
  followUpNote: 'Warning signs go to the discharge nurse as well as the family.',
}
