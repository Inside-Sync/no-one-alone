import type {
  ConditionKey, Lineage, LineageGeneration, LineageMatrixRow, LineageNode, ScreeningRow, StrengthRow,
} from '../types'

/** CX (prototype line 1476). */
const conditionKeys: Lineage['conditionKeys'] = {
  HTN: { name: 'Hypertension', color: '#c88a05' },
  STR: { name: 'Stroke', color: '#d9443f' },
  AF: { name: 'Atrial fibrillation', color: '#c2417a' },
  T2D: { name: 'Type 2 diabetes', color: '#e07a3f' },
  GLA: { name: 'Glaucoma', color: '#2f6fb0' },
  DEM: { name: 'Dementia', color: '#8f6fd0' },
  HEAR: { name: 'Hearing loss', color: '#1fb39c' },
}

const node = (
  name: string,
  sub: string,
  conditions: [ConditionKey, number | string][],
  kind?: LineageNode['kind'],
): LineageNode => (kind ? { name, sub, conditions, kind } : { name, sub, conditions })

/** GENS (lines 1478–1481). */
const generations: LineageGeneration[] = [
  {
    label: 'Grandparents',
    nodes: [
      node('Arthur Hughes', "†72 · Margaret's father", [['HTN', 55], ['STR', 68]], 'dec'),
      node('Edith Hughes', "†80 · Margaret's mother", [['GLA', 60], ['HEAR', 74], ['DEM', 77]], 'dec'),
    ],
  },
  {
    label: "Margaret's generation",
    nodes: [
      node('Margaret Collins', '78 · Marrickville', [['HTN', 61], ['HEAR', 72]], 'focus'),
      node('Robert Collins', '†75 · husband', [['HTN', 60], ['T2D', 58], ['AF', 70]], 'dec'),
      node('David Hughes', '74 · brother · Marrickville', [['HTN', 52], ['STR', 69]]),
    ],
  },
  {
    label: 'Children',
    nodes: [
      node('Sarah Collins', '49 · London', []),
      node('James Collins', '46 · Melbourne · you', [['HTN', '138/86']], 'you'),
    ],
  },
  {
    label: 'Grandchildren',
    nodes: [node('Lily Collins', '19 · Melbourne', []), node('Noah Collins', '16 · Melbourne', [])],
  },
]

/** `#strength` (line 1484). */
const strength: StrengthRow[] = (
  [
    ['Hypertension', 4, 'Strong'],
    ['Type 2 diabetes', 3, 'Moderate+'],
    ['Stroke', 2, 'Moderate'],
    ['Atrial fibrillation', 2, 'Moderate'],
    ['Glaucoma', 2, 'Moderate'],
    ['Dementia', 1, 'Weak'],
    ['Hearing loss', 1, 'Weak'],
  ] as const
).map(([condition, dots, label]) => ({ condition, dots, label }))

/** `#screen` (line 1485): [check, interval, due, tone, action]. */
const screening: ScreeningRow[] = (
  [
    ['Blood pressure check', '12 months', 'Overdue', 'bad', 'Book GP'],
    ['Heart health check (absolute CVD risk)', 'Every 2 years from 45', 'Due now', 'warn', 'Book'],
    ['Diabetes risk (AUSDRISK) + HbA1c', '3 years', 'Jan 2027', 'plain', ''],
    ['Eye exam incl. eye pressure', '2 years', 'Mar 2027', 'plain', ''],
    ['Lipids', '5 years', 'Done Aug 2025', 'good', ''],
    ['Hearing baseline', 'At 50', '2030', 'plain', ''],
  ] as const
).map(([check, interval, due, tone, action]) => ({ check, interval, due, tone, action }))

/** `#mx` (line 1486). */
const matrix: LineageMatrixRow[] = [
  { person: 'Arthur (grandfather)', onset: { HTN: 55, STR: 68 } },
  { person: 'Edith (grandmother)', onset: { GLA: 60, DEM: 77, HEAR: 74 } },
  { person: 'Robert (father)', onset: { HTN: 60, T2D: 58, AF: 70 } },
  { person: 'Margaret (mother)', onset: { HTN: 61, HEAR: 72 } },
  { person: 'David (uncle)', onset: { HTN: 52, STR: 69 } },
  { person: 'Sarah (sister)', onset: {} },
  { person: 'James (you)', onset: { HTN: '↑' } },
]

export const lineage: Lineage = {
  heading: 'Four generations',
  meta: 'From Family Connect · 11 people · 9 consented',
  conditionKeys,
  legendNote: 'Number = age at onset',
  generations,
  strengthHeading: 'Family pattern strength for you, James',
  strength,
  strengthNote:
    'Strength reflects how many relatives were affected, how closely related they are and how young. It guides screening, it does not predict genes.',
  screeningHeading: { title: 'Your screening plan', meta: 'James Collins · 46' },
  screening,
  screeningToast: 'Booking request sent to your GP in Melbourne',
  matrixColumns: ['HTN', 'STR', 'AF', 'T2D', 'GLA', 'DEM', 'HEAR'],
  matrix,
  consent: {
    // `#cm` (line 1490): one switch per person and data type.
    columns: ['Conditions', 'Medicines', 'Vitals', 'Location', 'Genetic'],
    rows: [
      { person: 'Margaret', shares: [true, true, true, true, false] },
      { person: 'David', shares: [true, false, false, false, false] },
      { person: 'Sarah', shares: [true, true, false, false, false] },
      { person: 'James (you)', shares: [true, true, false, false, false] },
      { person: 'Robert (estate)', shares: [true, false, false, false, false] },
    ],
    note: 'Stored per person and per data type. Changes apply within a minute and are written to the audit log.',
  },
  context: {
    initials: 'HL',
    color: '#8f6fd0',
    sub: '4 generations · 11 people · Family Connect',
    facts: [
      { live: true, label: 'Consented', value: '9 of 11' },
      { live: false, label: 'Conditions', value: '7' },
      { live: false, label: 'Your plan', value: '2 due' },
    ],
  },
}
