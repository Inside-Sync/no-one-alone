import type { HealthData, HealthGroup, HypnogramSegment, RhythmCell } from '../types'
import { mini, type MiniRow } from './helpers'
import { rng } from './rng'

/** Prototype lines 1604–1605: `#gauges`. */
const goals: HealthData['goals'] = [
  { label: 'Move', value: 212, goal: 300, unit: 'kcal', color: '#ef6a5e' },
  { label: 'Exercise', value: 18, goal: 30, unit: 'min', color: '#1fb39c' },
  { label: 'Stand', value: 9, goal: 12, unit: 'hours', color: '#5a7fe0' },
]

/** Prototype lines 1606–1619: 24 h heart rate, regenerated with the same seed (9). */
function buildHr24(): HealthData['hr24'] {
  const R = rng(9)
  const points: number[] = []
  for (let i = 0; i <= 288; i++) {
    const h = (15 + i / 12) % 24
    let v: number
    if (h >= 23 || h < 6.2) v = 57 + R() * 4
    else if (h >= 13.6 && h < 15.5 && i > 200) v = 61 + R() * 4
    else v = 66 + R() * 9
    if ((h >= 1 && h < 1.3) || (h >= 2.8 && h < 3.1) || (h >= 4.05 && h < 4.2)) v += 14
    if (h >= 10.05 && h < 10.45 && i > 200) v = 92 + R() * 18
    if (h >= 17.5 && h < 17.9 && i < 60) v = 88 + R() * 10
    points.push(v)
  }
  // The band draws its randomness after the series, hi pass first, then lo.
  const hi = points.map((v) => v + 4 + R() * 3)
  const lo = points.map((v) => v - 4 - R() * 3)
  return {
    points,
    band: { hi, lo },
    alerts: [
      { index: 134, label: '02:14' },
      { index: 152, label: '03:40' },
    ],
    walk: { index: 229, value: 112, label: 'walk 112' },
    axisLabels: ['15:00', '18:00', '21:00', '00:00', '03:00', '06:00', '09:00', '12:00', '15:00'],
    asleepFrom: 96,
    asleepTo: 180,
  }
}

/** Prototype lines 1791–1799: the plain-language groups (the version shown). */
type GroupDef = [HealthGroup['icon'], string, string, HealthGroup['category'], MiniRow[]]
const groupDefs: GroupDef[] = [
  ['heart', '❤️', 'Heart', 'heart', [['💓 At rest', '68 bpm', 'usual 63', 'warn'], ['🚶 When walking', '92 bpm', 'normal'], ['🌿 Calm score', '26', 'lower than usual', 'warn'], ['⏱️ Recovers after walk', '18 beats', 'in 1 minute'], ["📈 Today's range", '58–112', 'bpm'], ['🏃 Fitness level', 'Average', 'for her age']]],
  ['lungs', '🫁', 'Heartbeat and breathing', 'heart', [['⚡ Uneven heartbeat', '2 alerts', 'this week', 'bad'], ['🌙 Uneven at night', '~3%', 'of the night', 'warn'], ['📄 Heart tracing (ECG)', 'Normal', '12 Oct', 'good'], ['🩸 Oxygen in blood', '95%', 'normal'], ['🌬️ Breaths a minute', '15', 'asleep · normal'], ['🌡️ Skin temperature', 'Normal', '+0.3°']]],
  ['trend', '🔥', 'Moving and energy', 'activity', [['👣 Steps', '3,240', 'goal 3,500'], ['📏 Distance', '2.1 km', 'walked'], ['🪜 Stairs', '2 flights', 'climbed'], ['🔥 Calories moving', '212', 'kcal'], ['🛋️ Calories at rest', '1,428', 'kcal'], ['🏋️ Exercise', '18 min', 'goal 30', 'warn']]],
  ['people', '🚶', 'Walking and balance', 'activity', [['🐢 Walking speed', 'Slower', '0.82 m/s', 'warn'], ['👟 Step length', '51 cm', 'usual 54'], ['🦶 Both feet down', '34%', 'less steady', 'warn'], ['⚖️ Even steps', 'Yes', '6% difference'], ['🧍 Steadiness', 'Low', 'higher fall chance', 'bad'], ['🕕 6-minute walk', '310 m', 'usual 340']]],
  ['moon', '😴', 'Sleep', 'sleep', [['🛌 Asleep', '6h 12m', 'usual 7h', 'warn'], ['✨ Good sleep', '81%', 'of time in bed'], ['🌑 Deep sleep', '52 min', 'restoring'], ['💭 Dream sleep', '52 min', 'normal'], ['👀 Woke up', '6 times', '38 min awake', 'warn'], ['🕙 Bedtime', '10:41 pm', 'fairly regular']]],
  ['smile', '😊', 'Mood and company', 'mood', [['😊 Mood today', 'Cheerful', 'from her voice', 'good'], ['🙂 This week', 'Mostly good', 'steady'], ['🫂 Feeling lonely', 'A little', '4 out of 9'], ['📞 Phone calls', '5', 'this week'], ['🏡 Visits', '2', 'this week'], ['🧘 Calm breathing', '10 min', 'today']]],
  ['drop', '💧', 'Body and food', 'heart', [['⚖️ Weight', '61.2 kg', 'steady'], ['📐 Body size (BMI)', 'Healthy', '23.4'], ['💧 Water', '1.1 of 1.5 L', 'drink more', 'warn'], ['🍽️ Meals', '3', 'told us by voice'], ['🫖 Cups of tea', '2', 'today'], ['🌡️ Temperature', '36.7°', 'normal']]],
  ['ear', '👂', 'Hearing and senses', 'speech', [['🔊 Noise around her', '62 dB', 'normal'], ['📺 TV volume', 'Loud', '74 dB', 'warn'], ['❓ "Pardon?"', '9 times', 'this week', 'warn'], ['🦻 Hearing aids', 'Not worn', 'today', 'bad'], ['☀️ Time outdoors', '38 min', 'goal 60'], ['🔠 Screen text', 'Extra large', '28 pt']]],
  ['pill', '💊', 'Tablets and blood pressure', 'meds', [['✅ Taken on time', '86%', 'some missed', 'warn'], ['🌅 Morning BP', '146/88', 'high', 'bad'], ['🌙 Evening BP', '139/84', 'a bit high', 'warn'], ['💊 Today', '2 of 3', 'next at 6 pm'], ['❌ Missed', '3', 'this week', 'warn'], ['📦 Tablets left', '12 days', 'refill soon']]],
]

const groups: HealthGroup[] = groupDefs.map(([icon, emoji, title, category, metrics]) => ({
  icon, emoji, title, category, metrics: metrics.map(mini),
}))

/** Prototype line 1633: sleep stage sequence [stage, minutes]. */
const hypnogramSegments: HypnogramSegment[] = (
  [[0, 9], [2, 30], [3, 25], [2, 40], [1, 12], [2, 25], [0, 14], [2, 30], [3, 18], [2, 20], [0, 10], [1, 15], [2, 35], [3, 9], [0, 5], [2, 40], [1, 25], [2, 35], [0, 10], [1, 30]] as const
).map(([stage, minutes]) => ({ stage, minutes }))

/** Prototype lines 1434–1440: weekly routine heatmap, seed 5. */
function buildRhythm(): HealthData['rhythm'] {
  const R = rng(5)
  const dayLabels = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Today']
  const base = [.05, .04, .03, .03, .03, .04, .1, .55, .8, .7, .75, .6, .55, .5, .25, .35, .5, .55, .6, .65, .55, .4, .2, .08]
  const anomalies: Record<string, number> = { '0-2': .6, '2-3': .7, '4-1': .55, '6-14': .05 }
  const days = dayLabels.map((label, di) => {
    const cells: RhythmCell[] = []
    for (let h = 0; h < 24; h++) {
      const key = `${di}-${h}`
      const fixed = anomalies[key]
      const v = fixed != null ? fixed : Math.max(0, Math.min(1, base[h] * (0.8 + R() * 0.4)))
      cells.push({ value: v, anomaly: fixed != null, future: di === 6 && h > 15 })
    }
    return { label, cells }
  })
  return {
    dayLabels,
    days,
    notes: [
      { icon: 'moon', lead: 'Up more at night than usual', text: ' on 3 of the last 7 nights, between 1 and 4 am. It may be poor sleep or more trips to the bathroom. Worth mentioning to her GP.' },
      { icon: 'sun', lead: 'A longer afternoon nap', text: ' today, about 48 minutes more than usual. The heat at home is the likely reason.' },
    ],
  }
}

export const health: HealthData = {
  goals,
  goalTotals: (
    [
      ['Total energy', '1,640', 'kcal · 212 active'],
      ['Distance', '2.1', 'km · 2 flights'],
      ['Daylight', '38', 'min outdoors'],
    ] satisfies MiniRow[]
  ).map(mini),
  hr24: buildHr24(),
  groups,
  hypnogram: {
    title: '22:41 – 05:58 · 6 h 12 min asleep',
    stageNames: ['Awake', 'REM', 'Core', 'Deep'],
    legend: ['Awake', 'Dream sleep', 'Light sleep', 'Deep'],
    segments: hypnogramSegments,
    axisLabels: [
      { text: '22:41', at: 0 },
      { text: '00:30', at: 0.25 },
      { text: '02:30', at: 0.52 },
      { text: '04:30', at: 0.8 },
      { text: '05:58', at: 1 },
    ],
  },
  mood14: {
    values: [.4, .5, .2, -.1, .3, .6, .7, .3, -.2, .1, .4, .5, .6, .62],
    hotDays: [3, 8],
    walkDays: [5, 12],
    tags: [
      { tone: 'good', text: 'Better on walking-group days' },
      { tone: 'warn', text: 'Lower on hot days' },
      { tone: 'plain', text: 'Most mentioned: family, garden, weather' },
    ],
  },
  steps14: [3900, 3600, 4200, 2600, 3400, 4800, 4100, 3300, 2400, 3100, 3700, 4300, 3500, 3240],
  stepsGoal: 3500,
  bp14: {
    morning: [134, 133, 136, 135, 138, 137, 139, 140, 141, 143, 142, 144, 145, 146],
    evening: [128, 129, 130, 129, 131, 132, 133, 134, 134, 136, 137, 138, 139, 139],
    target: 135,
  },
  rhythm: buildRhythm(),
  todayChat: {
    time: '13:02 · 2 min 14 s',
    bubbles: [
      { from: 'family', text: 'Mum, what did you have for lunch?' },
      { from: 'margaret', text: 'A ham sandwich and a cup of tea, love.' },
    ],
    stats: (
      [
        ['🗣️ Speaking pace', '132', 'words a minute · usual 141'],
        ['⏸️ Pauses', 'A few more', 'than usual', 'warn'],
        ['✅ Clear speech', 'Yes', 'no slurring', 'good'],
        ['🔤 Lost for words', '3 times', 'usually once or twice'],
        ['👂 "Pardon?"', '2 times', 'hearing', 'warn'],
        ['😊 Mood', 'Cheerful', 'good day', 'good'],
      ] satisfies MiniRow[]
    ).map(mini),
  },
  homeToday: {
    pill: { tone: 'warn', text: 'Heat: moderate' },
    stats: (
      [
        ['🌡️ Inside', '29.5°', 'too warm', 'warn'],
        ['☀️ Outside', '33°', 'feels like 35°'],
        ['💦 Humidity', '58%', 'inside'],
        ['🍃 Air', 'Good', 'clean today', 'good'],
        ['🕶️ Sun strength', 'Extreme', 'stay in shade', 'bad'],
        ['💧 Drink reminders', '6 of 8', 'answered'],
      ] satisfies MiniRow[]
    ).map(mini),
    note: 'Thursday forecast 38 °C. The agent will add a midday check-in and offer a lift to the library cool room (120 places, 400 m).',
  },
}
