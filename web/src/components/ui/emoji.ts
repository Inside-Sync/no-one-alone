import type { IconName } from '@/data/types'

/**
 * The colour emoji the design uses where an icon stands for something (a tile, a card title, an Individual tab).
 * Icons without an entry (arrows, play, plus) stay line icons. This is the one source file allowed to hold emoji;
 * `tests/emoji.test.ts` keeps every other file drawing them through `Icon`.
 */
export const EMOJI: Partial<Record<IconName, string>> = {
  home: '🏠', spark: '✨', tree: '🌳', file: '📄', bell: '🔔', bolt: '⚡', mic: '🎤', heart: '❤️', trend: '📈', pill: '💊',
  people: '👨‍👩‍👧', ear: '👂', eye: '👁️', brain: '🧠', clinic: '🩺', hospital: '🏥', phone: '📞', pause: '⏸️', check: '✅', x: '❌',
  sun: '🌞', search: '🔍', target: '🎯', siren: '🚨', shield: '🛡️', radar: '📡', moon: '🌙', cpu: '💻', smile: '😊',
  news: '📰', wind: '🌬️', drop: '💧', cloud: '☁️', lungs: '🫁', watch: '⌚',
  accessibility: '♿', activity: '🏃', ambulance: '🚑', 'arrow-down': '⬇️', ban: '🚫', bean: '🫘', bed: '😴',
  'bell-off': '🔕', 'biceps-flexed': '💪', bone: '🦴', 'book-open': '📖', bot: '🤖', cake: '🎂', calendar: '📅',
  camera: '📷', candy: '🍬', 'chart-column': '📊', 'cigarette-off': '🚭', 'circle-check': '✅', 'circle-help': '❓',
  'circle-x': '❌', 'clipboard-list': '📋', clock: '🕒', 'cloud-moon': '🌙', 'cloud-rain': '🌧️', 'cloud-sun': '🌤️',
  coffee: '☕', compass: '🧭', 'cooking-pot': '🍲', 'door-stairwell': '🪜', droplets: '💦', dumbbell: '🏋️',
  'fast-forward': '⏩', flame: '🔥', 'flask-conical': '🧪', folder: '📁', footprints: '👣', glasses: '👓', hand: '✋',
  handshake: '🤝', headphones: '🎧', 'heart-crack': '💔', 'heart-handshake': '💞', 'heart-pulse': '💓', info: 'ℹ️',
  leaf: '🍃', lightbulb: '💡', lock: '🔒', 'map-pin': '📍', meh: '😐', 'message-circle': '💬', 'notebook-pen': '📝',
  'notebook-text': '📓', 'octagon-x': '🛑', package: '📦', 'party-popper': '🎉', 'pen-line': '✏️',
  'person-standing': '🧍', 'phone-off': '📵', plane: '✈️', 'plug-zap': '🔌', receipt: '🧾', 'refresh-cw': '🔄',
  ruler: '📏', scale: '⚖️', settings: '⚙️', share: '📤', 'sliders-horizontal': '🎚️', smartphone: '📱', sofa: '🛋️',
  sparkles: '✨', speech: '🗣️', sprout: '🌱', stethoscope: '🩺', 'sun-dim': '🔅', sunrise: '🌅', syringe: '💉',
  telescope: '🔭', thermometer: '🌡️', 'thermometer-sun': '🌡️', 'thumbs-up': '👍', timer: '⏱️', 'triangle-alert': '⚠️',
  turtle: '🐢', tv: '📺', type: '🔤', 'user-round': '🧑', users: '👨‍👩‍👧', utensils: '🍽️', 'volume-2': '🔊',
  'volume-x': '🔇', waves: '🌊', wheat: '🌾', wine: '🍷',
  baby: '👶', car: '🚗', droplet: '🩸', globe: '🌍', 'graduation-cap': '🎓', salad: '🥗', star: '⭐',
}
