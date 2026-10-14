import type { Forecast, RiskRow, ShapDriver, SignRow } from '../types'
import { mini, type MiniRow } from './helpers'

/** `#riskRows` (prototype line 1445): [name, 1 mo, 3 mo, 1 yr, range, level, tone, trend, reason]. */
const risks: RiskRow[] = (
  [
    ['Stroke', '0.7%', '2.1%', '7.8%', '1.4–3.0', 'High', 'bad', '↑', 'BP trend'],
    ['Fall with injury', '9.0%', '21%', '38%', '16–27', 'High', 'bad', '↑', 'Gait speed −8%'],
    ['Hospital admission', '5.2%', '14%', '41%', '10–19', 'Medium', 'warn', '↑', 'BP + heat'],
    ['Heat-related illness', '6.0%', '—', '—', '4.1–8.8 (7 d)', 'Medium', 'warn', '↑', 'No air-con, 29.5 °C'],
    ['Hearing decline', '—', '18%', '46%', '13–24', 'Medium', 'warn', '↑', '"Pardon?" ×9/wk'],
    ['Cognitive decline (MCI)', '—', '3.1%', '11%', '2.0–4.6', 'Watch', 'warn', '→', 'Word-finding + hearing'],
    ['Heart failure episode', '0.8%', '2.3%', '8.1%', '1.5–3.4', 'Low', 'good', '→', 'Weight stable'],
    ['Low mood / loneliness', '7%', '12%', '22%', '8–17', 'Low', 'good', '↓', 'Walking group'],
  ] as const
).map(([name, nextMonth, threeMonths, nextYear, range, level, tone, trend, reason]) => ({
  name, nextMonth, threeMonths, nextYear, range, level, tone, trend, reason,
}))

/** SH (line 1446): SHAP-style contributions to the stroke chance. */
const shap: ShapDriver[] = (
  [
    ['Blood pressure trend', 0.58],
    ['Family history', 0.31],
    ['Missed doses', 0.22],
    ['Irregular rhythm alerts', 0.09],
    ['Low HRV', 0.08],
    ['Indoor heat', 0.05],
    ['Daily activity', -0.06],
    ['LDL controlled (2.4)', -0.07],
  ] as const
).map(([label, value]) => ({ label, value }))

/**
 * `#sigRows`: plain-language version (line 1802, shown) merged with the
 * technical z-score column of the original (line 1448).
 * [sign, from, how often, now, usual, compared with usual, sigma, tone]
 */
const signs: SignRow[] = (
  [
    ['🩺 Morning blood pressure', 'Arm cuff', 'Every morning', '146', '132', 'Much higher', '+2.8', 'bad'],
    ['❤️ Resting heart rate', 'Watch', 'All day', '68', '63', 'About the same', '+0.4', 'good'],
    ['🌿 Calm score (HRV)', 'Watch', 'Every night', '26', '31', 'Lower', '−1.9', 'warn'],
    ['⚡ Uneven heartbeat alerts', 'Watch', 'When it happens', '2 this week', 'rarely', 'Higher', '+2.4', 'warn'],
    ['🚶 Walking speed', 'Phone + home', 'Every day', '0.82 m/s', '0.89', 'Slower', '−2.1', 'warn'],
    ['🌙 Up at night', 'Home sensors', 'All night', '41 times', '18', 'Much higher', '+2.3', 'warn'],
    ['💊 Tablets taken', 'Pill box', 'Every dose', '86%', '95%', 'Lower', '−1.8', 'warn'],
    ['⏸️ Pauses when talking', 'Daily chat', 'Every day', 'More', 'fewer', 'Higher', '+1.6', 'warn'],
    ['👂 "Pardon?"', 'Daily chat', 'Every day', '9 this week', '3', 'Much higher', '+2.6', 'warn'],
    ['🌡️ Home temperature', 'Home sensors', 'All day', '29.5°', '25.1°', 'Much higher', '+2.2', 'warn'],
    ['⚖️ Weight', 'Scale', 'Every day', '61.2 kg', '61.0', 'About the same', '+0.2', 'good'],
  ] as const
).map(([sign, from, frequency, now, usual, comparison, sigma, tone]) => ({
  sign, from, frequency, now, usual, comparison, sigma, tone,
}))

export const forecast: Forecast = {
  stroke90d: 2.1,
  wellbeing: { score: 72, delta: -5 },
  wellbeingNote:
    '72 out of 100, down 5 since last week. Two things are pulling it down: her blood pressure is creeping up, and her home is too warm.',
  // Radar axes (line 1421): [axis, now, last month].
  wellbeingAxes: (
    [
      ['❤️ Body', 61, 74],
      ['💊 Medicines', 68, 90],
      ['🚶 Moving', 74, 80],
      ['😴 Sleep', 70, 76],
      ['🤝 Social', 82, 84],
      ['🧠 Memory', 88, 90],
      ['🏠 Home', 58, 78],
    ] as const
  ).map(([label, now, lastMonth]) => ({ label, now, lastMonth })),
  comingUp: {
    title: '🔮 Coming up: one thing to act on',
    meta: 'Stroke · 90 days',
    pill: { tone: 'bad', text: 'Higher than most women her age' },
    headline: "Mum's blood pressure is drifting up. Act this week.",
    stats: (
      [
        ['90-day stroke risk', '2.1%', '2.4× her usual', 'bad'],
        ['Morning systolic, 7-day', '146', '+14 mmHg / 6 wk', 'warn'],
        ['If doses back to 100%', '1.3%', '−38% relative', 'good'],
      ] satisfies MiniRow[]
    ).map(mini),
    reasons: [
      { icon: 'trend', text: 'Morning blood pressure up 14 mmHg over 6 weeks, a steady rise each week' },
      { icon: 'pill', text: 'Her evening blood pressure tablet was missed 3 times this week' },
      { icon: 'tree', text: 'Her father and brother both had strokes before 70' },
    ],
    actions: [
      { label: 'Ask David to set up a pill box', kind: 'toast', value: "Sent to David · he'll set up the pill box on Saturday", icon: 'people', soft: false },
      { label: 'Send BP report to Dr Patel', kind: 'toast', value: 'Blood pressure report sent to Dr Patel', soft: true },
      { label: 'See the full forecast', kind: 'go', value: 'forecast', soft: true },
    ],
  },
  // `note` is the verbatim small text, which already begins with the owner.
  weeklyPlan: [
    { icon: 'sun', iconColor: 'var(--sun-ink)', title: 'Thu 11:00–15:00 · extra heat check-ins', owner: 'Agent', note: 'Agent · fluids every 2 h · lift to library cool room offered', status: { tone: 'brand', text: 'Scheduled' } },
    { icon: 'pill', title: 'Sat 10:00 · weekly pill box set-up', owner: 'David', note: 'David · reduces missed evening doses', status: { tone: 'warn', text: 'Needs approval' } },
    { icon: 'clinic', title: 'Mon · GP blood pressure review', owner: 'Dr Patel', note: 'Dr Patel · report already sent', status: { tone: 'plain', text: 'To book' } },
    { icon: 'ear', title: '22 Oct · hearing test', owner: 'David', note: 'Marrickville audiology · David drives', status: { tone: 'good', text: 'Booked' } },
  ],
  weeklyPlanMeta: '4 tasks · 2 owners',
  model: (
    [
      ['👀', 'Watches', '64 signs'],
      ['📚', 'Learned from', '48,000 histories'],
      ['🎯', 'Right about', '8 in 10 times'],
      ['🩺', 'Follows', "Doctors' guidelines"],
      ['🔄', 'Updated', 'Every hour'],
      ['🧑‍⚕️', 'Decides', 'Her doctor, not the app'],
    ] as const
  ).map(([emoji, label, value]) => ({ emoji, label, value })),
  modelMeta: 'Example figures for a prototype',
  risks,
  shap,
  shapNote:
    "A typical woman her age on blood pressure tablets has about a 0.9% chance. These reasons add up to Margaret's 2.1%.",
  signs,
  bp: {
    observed: [128, 131, 133, 137, 140, 146],
    projectedNothing: [146, 148.5, 151, 153.5, 156],
    projectedAdherent: [146, 140, 136, 133, 131],
    target: 135,
    weeks: 10,
    todayWeek: 6,
    lo: 120,
    hi: 166,
  },
  sim: {
    sliders: [
      { id: 'adherence', label: '💊 Tablets taken on time', min: 60, max: 100, step: 1, value: 86 },
      { id: 'steps', label: '👣 Steps a day', min: 1500, max: 7000, step: 100, value: 3240 },
      { id: 'salt', label: '🧂 Salt in food', min: 0, max: 2, step: 1, value: 1 },
    ],
    saltLabels: ['Low', 'Medium', 'High'],
    hearingLabel: '👂 Wears hearing aids every day',
    hearingAids: false,
    base: { stroke: 2.1, fall: 21, admission: 14, mci: 3.1 },
    note: 'Relative effects come from published effect sizes and are applied to her current risk. A conversation starter for her GP, not a prescription.',
  },
  modes: [
    { name: 'Hearing', icon: 'ear', title: 'Hearing mode', description: "Captions, flashing screen and yes/no cards when she doesn't answer by voice", on: true, tag: 'ON · AUTO-ENABLED 09 OCT' },
    { name: 'Vision', icon: 'eye', title: 'Vision mode', description: 'Voice only, no buttons to find; the camera reads pill labels aloud', on: false, tag: 'OFF' },
    { name: 'Memory', icon: 'brain', title: 'Memory mode', description: 'Daily routine prompts in a familiar voice, help finding the way home, only if Margaret agrees', on: false, tag: 'OFF · WATCHING' },
  ],
}
