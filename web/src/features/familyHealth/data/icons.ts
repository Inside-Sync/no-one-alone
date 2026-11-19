import type { FhIcon } from './types'

/**
 * Every icon name the family-health data and engine use, with the prototype emoji it stands for (in comments, so this file stays
 * free of emoji as `tests/emoji.test.ts` requires). The UI maps the names to its icon table (`components/ui/emoji.ts`).
 *
 *   grandma 👵 · grandpa 👴 · dad 👨 · mum 👩 · son 👦 · daughter 👧
 *   orchestrator 🎼 (Orchestrator box) · puzzle 🧩 (Orchestrator skill) · shield 🛡️ Guardian · speech 🗣️ Voice
 *   graduation-cap 🎓 Coach · trend 📈 Forecast · compass 🧭 Navigator · package 📦 Courier / posted kit · search 🔎 Insight
 *   chart-column 📊 Analyst · home 🏠 Personal care agent · clinic 🩺 Screening agent / symptom line · xray 🩻 Specialist agent
 *   landmark 🏛️ Government agent · conductor 🎼
 *   droplet 🩸 · stethoscope 🩺 · watch ⌚ · scale ⚖️ · ear 👂 · footprints 🚶 · message-circle 💬 · bed 😴
 *   check ✓ · lock 🔒 · stop ⛔ · arrow-up ⬆️ · family 👪 · recall 🔁 · calendar 📅 · child 🧒 · bot 🤖 · type 🔤
 *   bell 🔔 · sun 🌞 · heart ❤ · activity 🚶
 */
export const FH_ICONS: readonly FhIcon[] = [
  'grandma', 'grandpa', 'dad', 'mum', 'son', 'daughter', 'orchestrator', 'puzzle', 'shield', 'speech', 'graduation-cap', 'trend',
  'compass', 'package', 'search', 'chart-column', 'home', 'clinic', 'xray', 'landmark', 'conductor', 'droplet', 'stethoscope',
  'watch', 'scale', 'ear', 'footprints', 'message-circle', 'bed', 'check', 'lock', 'stop', 'arrow-up', 'family', 'recall',
  'calendar', 'child', 'bot', 'type', 'bell', 'sun', 'heart', 'activity',
]
