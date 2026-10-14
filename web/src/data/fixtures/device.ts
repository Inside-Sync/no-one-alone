import type { DeviceFeed, DeviceRow } from '../types'
import { mini, type MiniRow } from './helpers'

/** `#devices` (prototype line 1660): [device, metrics, frequency, status, tone, shared with]. */
const sources: DeviceRow[] = (
  [
    ['Wrist wearable', 'Heart rate, HRV, rhythm, ECG, blood oxygen, sleep stages, steps, energy, wrist temperature, fall detection, noise', 'Continuous · 5 min', '64% · on wrist', 'good', 'Family, GP'],
    ['Phone', 'Walking speed, step length, steadiness, daylight · location is off (Margaret can turn on home/out only)', 'Passive', 'Charging', 'good', 'Family'],
    ['Bluetooth BP cuff', 'Systolic, diastolic, pulse', 'Morning + evening', 'Batteries 70%', 'good', 'Family, GP'],
    ['Smart scale', 'Weight, BMI', 'Daily', 'OK', 'good', 'GP'],
    ['Smart pill box', 'Dose taken, time, missed doses', 'Per dose', 'OK', 'good', 'Family, GP, pharmacy'],
    ['Home hub · 6 sensors', 'Movement in 2 rooms (no cameras, no microphones), temperature, humidity', 'Continuous', 'Online', 'good', 'Family (emergency detail only)'],
    ['Voice check-ins', 'Mood, speech rate, pauses, articulation, hearing, meals, fluids', '2–3 calls a day', 'Next 18:00', 'plain', 'Family, GP; hospital only in emergency'],
  ] as const
).map(([device, metrics, frequency, status, tone, sharedWith]) => ({ device, metrics, frequency, status, tone, sharedWith }))

export const deviceFeed: DeviceFeed = {
  meta: '48 readings from 6 devices · like a smartwatch, plus her home and her voice',
  sources,
  phone: {
    home: {
      date: 'Wednesday 14 October',
      greeting: 'Hello, Margaret',
      medicine: {
        title: 'Blood pressure tablet',
        sub: '18:00 · 1 amlodipine',
        button: "I've taken it",
        toast: 'Noted · James will see it',
      },
      ok: { label: "I'm OK", toast: "The family knows you're OK" },
      help: { label: 'Get help' },
    },
    heading: 'Designed for Margaret',
    meta: 'No training, no menus',
    minis: (
      [
        ['Text size', '28 pt', 'minimum'],
        ['Touch targets', '92 px', 'WCAG AAA'],
        ['Voice', 'Aus EN', 'slow, warm'],
        ['Steps per task', '1', 'always'],
        ['Works on', 'Any phone', 'incl. landline'],
        ['Hearing mode', 'On', 'captions + flash'],
      ] satisfies MiniRow[]
    ).map(mini),
    bullets: [
      { icon: 'check', text: 'Two large buttons and one task at a time. Nothing to navigate.' },
      { icon: 'ear', text: 'Hearing mode: large captions and a flashing screen when the agent calls.' },
      { icon: 'mic', text: 'Voice first, with the names she uses for her family ("love", "Davey").' },
      { icon: 'phone', text: 'The same check-ins work as an ordinary phone call for people without a smartphone.' },
    ],
    note: 'Press Get help on her screen to start the night alert demo.',
  },
}
