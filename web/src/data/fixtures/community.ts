import type {
  CommunityData, FunnelStage, LanguageRow, ProgramRow, Suburb, VisitRow,
} from '../types'
import { kpi, mini, type KpiRow, type MiniRow } from './helpers'

/**
 * SUBS (prototype lines 1319–1322). The prototype stores positional arrays:
 * [name, col, row, enrolled, % alone, high-risk, heat index, volunteers, language].
 */
const suburbs: Suburb[] = (
  [
    ['Marrickville', 2, 1, 312, 41, 38, 0.82, 9, 'Greek'],
    ['Dulwich Hill', 1, 1, 198, 36, 22, 0.64, 6, 'Greek'],
    ['Petersham', 2, 2, 121, 39, 14, 0.58, 4, 'Portuguese'],
    ['Stanmore', 3, 2, 96, 33, 9, 0.44, 5, 'English'],
    ['Enmore', 3, 1, 84, 44, 12, 0.72, 3, 'English'],
    ['Newtown', 4, 1, 143, 47, 17, 0.69, 7, 'English'],
    ['Lewisham', 1, 2, 77, 35, 8, 0.51, 2, 'Arabic'],
    ['Summer Hill', 0, 3, 110, 31, 10, 0.4, 6, 'Italian'],
    ['Ashfield', 0, 2, 264, 37, 31, 0.77, 8, 'Mandarin'],
    ['Leichhardt', 2, 3, 156, 34, 13, 0.38, 7, 'Italian'],
    ['Annandale', 3, 3, 72, 30, 6, 0.33, 4, 'English'],
    ['Tempe', 2, 0, 58, 42, 9, 0.86, 1, 'Vietnamese'],
    ['St Peters', 4, 0, 49, 39, 7, 0.79, 1, 'Vietnamese'],
    ['Sydenham', 3, 0, 31, 45, 6, 0.83, 0, 'Portuguese'],
    ['Camperdown', 4, 2, 75, 40, 10, 0.55, 1, 'English'],
  ] as const
).map(([name, col, row, enrolled, alonePct, highRisk, heat, volunteers, language]) => ({
  name, col, row, enrolled, alonePct, highRisk, heat, volunteers, language,
}))

const fmt = (n: number): string => n.toLocaleString('en-AU')

// Totals the prototype computes at runtime (lines 1517–1518).
const enrolled = suburbs.reduce((n, s) => n + s.enrolled, 0)
const alone = suburbs.reduce((n, s) => n + (s.enrolled * s.alonePct) / 100, 0)
const highRisk = suburbs.reduce((n, s) => n + s.highRisk, 0)
const volunteers = suburbs.reduce((n, s) => n + s.volunteers, 0)
const visitsShort = suburbs.reduce((n, s) => n + Math.max(0, s.highRisk * 2 - s.volunteers * 4), 0)

const kpis = (
  [
    ['Older residents enrolled', fmt(enrolled), '', '#0b7f71', '15 suburbs', '+64 mo', '', [1600, 1640, 1680, 1710, 1740, 1770, 1800, 1825, enrolled]],
    ['Living alone', String(Math.round((alone / enrolled) * 100)), '%', '#2f6fb0', fmt(Math.round(alone)) + ' people', '+1 pt', '', [36, 36, 37, 37, 37, 38, 38, 38, 38]],
    ['High risk', String(highRisk), 'people', '#d9443f', '11.5% of enrolled', '+6 mo', 'warn', [180, 186, 190, 195, 199, 204, 206, 209, highRisk]],
    ['Check-ins answered', '92.7', '% today', '#1fb39c', '1,712 of ' + fmt(enrolled), '−0.4 pts', '', [94, 93, 94, 93, 92, 93, 94, 93, 92.7]],
    ['Alert to door', '8.6', 'min median', '#0b7f71', 'p90 14.2 min', '−0.9 min', '', [10.2, 9.8, 9.6, 9.4, 9.1, 9.0, 8.9, 8.7, 8.6]],
    ['Active volunteers', String(volunteers), '', '#8f6fd0', '2.3 visits each/wk', '+5 mo', '', [48, 50, 53, 55, 57, 59, 61, 62, volunteers]],
    ['Alerts this week', '37', '', '#ef4e4a', '8 escalated', '−4 wk', '', [44, 41, 39, 42, 40, 38, 41, 39, 37]],
    ['False alarms filtered', '78', '%', '#1fb39c', '29 of 37', '+3 pts', '', [70, 71, 73, 74, 75, 76, 77, 77, 78]],
    ['Visits short this week', String(visitsShort), 'visits', '#d9443f', 'Tempe, Sydenham, St Peters', '+8 wk', 'warn', [38, 42, 40, 45, 48, 50, 52, 55, visitsShort]],
    ['Languages by voice', '7', '', '#5a7fe0', '+2 in beta', '+1 qtr', '', [4, 4, 5, 5, 5, 6, 6, 7, 7]],
    ['Cool-room places', '260', 'Thu', '#e07a3f', '3 sites · 137 free', 'new', '', [0, 0, 0, 0, 120, 200, 200, 260, 260]],
    ['ED forecast Thu', '34', 'aged 75+', '#d9443f', 'comfort line 28', '+13 vs Wed', 'warn', [21, 22, 20, 23, 21, 22, 21, 25, 34]],
  ] satisfies KpiRow[]
).map(kpi)

/** `#visits` (line 1526). */
const visits: VisitRow[] = (
  [
    ['Margaret C.', 78, 'Marrickville', 'High', 'bad', 'BP rising, missed doses', 'English', 'David · 450 m'],
    ['Eleni P.', 84, 'Marrickville', 'High', 'bad', 'Heart failure: +2.1 kg in 72 h', 'Greek', 'Volunteer Tom · 1.2 km'],
    ['Nguyen Van T.', 81, 'Tempe', 'High', 'bad', 'Heat: no air-con, indoor 33 °C', 'Vietnamese', 'None · gap'],
    ['Maria S.', 86, 'Petersham', 'High', 'bad', '2 falls in 30 days', 'Portuguese', 'Daughter · 15 min'],
    ['Fatima A.', 79, 'Lewisham', 'Medium', 'warn', 'Hearing decline, 3 missed check-ins', 'Arabic', 'Volunteer Aisha'],
    ['Giuseppe R.', 88, 'Leichhardt', 'Medium', 'warn', 'Night wandering ×2', 'Italian', 'Son · 8 min'],
    ['Wei L.', 77, 'Ashfield', 'Medium', 'warn', 'Low mood for 3 weeks', 'Mandarin', 'Volunteer Jun'],
    ['Peter H.', 80, 'Newtown', 'Watch', 'plain', 'New sleeping tablet', 'English', 'Neighbour · 2 min'],
  ] as const
).map(([name, age, suburb, risk, tone, reason, language, nearestHelp]) => ({
  name, age, suburb, risk, tone, reason, language, nearestHelp,
}))

/** `#funnel` (line 1527). */
const funnel: FunnelStage[] = (
  [
    ['Alerts received', 37, '#5a7fe0'],
    ['Checked by the agent', 37, '#2f6fb0'],
    ['False alarms filtered', 29, '#1fb39c'],
    ['Escalated to a person', 8, '#c88a05'],
    ['Someone at the door', 8, '#e07a3f'],
    ['Ambulance called', 3, '#d9443f'],
    ['Pre-arrival packets', 3, '#8f6fd0'],
  ] as const
).map(([label, value, color]) => ({ label, value, color }))

/** `#capacity` (line 1528): need = 2 × high-risk, capacity = 4 × volunteers; the 9 biggest gaps. */
const capacity = suburbs
  .map((s) => ({ name: s.name, need: s.highRisk * 2, capacity: s.volunteers * 4 }))
  .sort((a, b) => b.need - b.capacity - (a.need - a.capacity))
  .slice(0, 9)

/** `#langs` (line 1530). */
const languages: LanguageRow[] = (
  [
    ['English', 42, 'Full'],
    ['Greek', 13, 'Full'],
    ['Vietnamese', 9, 'Full'],
    ['Mandarin', 8, 'Full'],
    ['Italian', 7, 'Full'],
    ['Portuguese', 6, 'Beta'],
    ['Arabic', 6, 'Beta'],
    ['Other', 9, 'Interpreter'],
  ] as const
).map(([name, percent, support]) => ({ name, percent, support }))

/** `#progs` (line 1531). */
const programs: ProgramRow[] = (
  [
    ['Walking groups (3 parks)', 42, '78% (+18%)', 'Gait speed +0.04 m/s'],
    ['Friday social lunch', 65, '81%', 'Loneliness score −0.6 (UCLA-3)'],
    ['Strength and balance classes', 28, '72%', 'Falls with injury −12%'],
    ['Library tech help', 31, '64%', 'Family video calls 2.1/wk'],
    ["Men's shed", 19, '70%', 'Low-mood flags −30%'],
    ['Cool-room shuttle', 14, 'drivers', 'Heat ED visits −9% last summer'],
  ] as const
).map(([program, regulars, attendance, outcome]) => ({ program, regulars, attendance, outcome }))

export const community: CommunityData = {
  context: {
    initials: 'IW',
    color: '#6d4fc0',
    sub: 'Inner West Community Health · 15 suburbs · 1,846 older residents enrolled',
    facts: [
      { live: true, label: 'Synced', value: '15:00' },
      { live: false, label: 'Groups under 10', value: 'suppressed' },
      { live: false, label: 'Heatwave', value: 'Thursday' },
      { live: false, label: 'Volunteers on today', value: '23' },
    ],
  },
  kpis,
  suburbs,
  districtKicker: 'Inner West · 15 suburbs',
  heatwave: {
    pill: 'Thursday 38 °C',
    temps: [
      { day: 'Wed', value: 33 }, { day: 'Thu', value: 38 }, { day: 'Fri', value: 36 }, { day: 'Sat', value: 26 },
      { day: 'Sun', value: 24 }, { day: 'Mon', value: 23 }, { day: 'Tue', value: 25 },
    ],
    tempsThreshold: { value: 35, label: 'heatwave 35°', max: 40, unit: '°' },
    stats: (
      [
        ['Extra check-ins', '318', 'Thu 11:00–15:00'],
        ['No air-con', '127', 'priority', 'bad'],
        ['Lifts offered', '14', 'volunteer drivers'],
      ] satisfies MiniRow[]
    ).map(mini),
    coolRooms: [
      { name: 'Marrickville Library cool room', detail: '120 places · 09:00–20:00', left: '74 left', tone: 'good' },
      { name: 'Ashfield civic centre', detail: '80 places · 10:00–18:00', left: '22 left', tone: 'warn' },
      { name: 'Newtown neighbourhood centre', detail: '60 places · 10:00–17:00', left: '41 left', tone: 'good' },
    ],
    scheduleToast: '318 extra check-ins scheduled for Thursday',
  },
  visits,
  funnel,
  funnelMinis: (
    [
      ['Verify', '44 s', 'median'],
      ['Accept', '1:12', 'median'],
      ['At door', '8.6′', 'median'],
    ] satisfies MiniRow[]
  ).map(mini),
  capacity,
  edForecast: {
    meta: 'Presentations aged 75+, Camperdown ED',
    values: [
      { day: 'Wed', value: 21 }, { day: 'Thu', value: 34 }, { day: 'Fri', value: 31 }, { day: 'Sat', value: 25 },
      { day: 'Sun', value: 22 }, { day: 'Mon', value: 20 }, { day: 'Tue', value: 21 },
    ],
    threshold: { value: 29, label: 'comfort 28', max: 36, unit: '' },
    note: 'Forecast from the heat index, day of week and the last 90 days. Thursday is expected to exceed the 28-patient comfort line by 6.',
  },
  languages,
  programs,
  watchSummary: [
    { icon: 'shield', tone: 'bad', title: 'Door-to-door "solar rebate" scam', detail: 'Marrickville, Dulwich Hill · 14 reports · 1,240 residents warned by voice', pill: { tone: 'bad', text: 'Active' } },
    { icon: 'sun', tone: 'warn', title: 'Heatwave Thursday–Friday', detail: '318 extra check-ins · 127 without air-con', pill: { tone: 'warn', text: 'Planned' } },
    { icon: 'target', tone: 'warn', title: 'Footpath works · Marrickville Rd', detail: 'Trip hazard for 46 residents who walk that route', pill: { tone: 'warn', text: 'Until 24 Oct' } },
  ],
  footnote:
    'Community health staff see names for people enrolled in their area. Council and state views are aggregated and de-identified, with groups under 10 suppressed. All people and figures are fictional.',
}
