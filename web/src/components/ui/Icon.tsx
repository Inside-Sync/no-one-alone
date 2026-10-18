import type { CSSProperties } from 'react'
import {
  Accessibility, Activity, Ambulance, ArrowDown, Ban, Bean, Bed, BellOff, BicepsFlexed, Bone, BookOpen, Bot, Cake, Calendar,
  Camera, Candy, ChartColumn, CigaretteOff, CircleCheck, CircleHelp, CircleX, ClipboardList, Clock, CloudMoon,
  CloudRain, CloudSun, Coffee, Compass, CookingPot, DoorStairwell, Droplets, Dumbbell, FastForward, Flame,
  FlaskConical, Folder, Footprints, Glasses, Hand, Handshake, Headphones, HeartCrack, HeartHandshake, HeartPulse, Info,
  Leaf, Lightbulb, Lock, MapPin, Meh, MessageCircle, NotebookPen, NotebookText, OctagonX, Package, PartyPopper,
  PenLine, PersonStanding, PhoneOff, Plane, PlugZap, Receipt, RefreshCw, Ruler, Scale, Settings, Share,
  SlidersHorizontal, Smartphone, Sofa, Sparkles, Speech, Sprout, Stethoscope, SunDim, Sunrise, Syringe, Telescope,
  Thermometer, ThermometerSun, ThumbsUp, Timer, TriangleAlert, Turtle, Tv, Type, UserRound, Users, Utensils, Volume2,
  VolumeX, Waves, Wheat, Wine,
  type LucideIcon,
} from 'lucide-react'
import type { DotIconName, DrawnIconName, IconName, LucideIconName } from '@/data/types'

export type { IconName }

/** ICONS (prototype line 1125) plus EXTRA ICONS (line 1593): inner SVG markup, verbatim. */
const ICONS: Partial<Record<DrawnIconName, string>> = {
  home: "<path d=\"M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z\"/>",
  spark: "<path d=\"M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18\"/>",
  tree: "<circle cx=\"12\" cy=\"5\" r=\"2.2\"/><circle cx=\"6\" cy=\"18\" r=\"2.2\"/><circle cx=\"18\" cy=\"18\" r=\"2.2\"/><path d=\"M12 7.2V12M6 15.8V12h12v3.8\"/>",
  file: "<path d=\"M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z\"/><path d=\"M14 3v5h5M9 13h6M9 17h6\"/>",
  bell: "<path d=\"M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z\"/><path d=\"M10 20a2 2 0 0 0 4 0\"/>",
  bolt: "<path d=\"M13 3L5 13h6l-1 8 8-10h-6z\"/>",
  mic: "<rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21\"/>",
  heart: "<path d=\"M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z\"/>",
  right: "<path d=\"M9 5l7 7-7 7\"/>",
  left: "<path d=\"M15 5l-7 7 7 7\"/>",
  trend: "<path d=\"M3 17l6-6 4 4 7-8\"/><path d=\"M15 7h5v5\"/>",
  pill: "<rect x=\"3\" y=\"9\" width=\"18\" height=\"7\" rx=\"3.5\" transform=\"rotate(-35 12 12.5)\"/><path d=\"M9.2 8.6l5.2 7.4\"/>",
  people: "<circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3.5 19a5.5 5.5 0 0 1 11 0\"/><circle cx=\"17\" cy=\"9\" r=\"2.4\"/><path d=\"M15.5 14.2A4.5 4.5 0 0 1 21 18.5\"/>",
  ear: "<path d=\"M7 9a5 5 0 1 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0\"/><path d=\"M10 9.5a2 2 0 1 1 4 0\"/>",
  eye: "<path d=\"M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  brain: "<path d=\"M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3V4z\"/>",
  plus: "<path d=\"M12 5v14M5 12h14\"/>",
  minus: "<path d=\"M5 12h14\"/>",
  clinic: "<path d=\"M4 20V9l8-5 8 5v11z\"/><path d=\"M12 10v6M9 13h6\"/>",
  hospital: "<rect x=\"4\" y=\"5\" width=\"16\" height=\"15\" rx=\"2\"/><path d=\"M12 9v7M8.5 12.5h7\"/>",
  phone: "<path d=\"M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z\"/>",
  pause: "<path d=\"M9 5v14M15 5v14\"/>",
  play: "<path d=\"M7 5l12 7-12 7z\"/>",
  check: "<path d=\"M5 12.5l4.5 4.5L19 7\"/>",
  x: "<path d=\"M6 6l12 12M18 6L6 18\"/>",
  grid: "<rect x=\"4\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"4\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"/>",
  sun: "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4\"/>",
  search: "<circle cx=\"11\" cy=\"11\" r=\"6\"/><path d=\"M20 20l-4.5-4.5\"/>",
  target: "<circle cx=\"12\" cy=\"12\" r=\"7\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\"/><path d=\"M12 2v3M12 19v3M2 12h3M19 12h3\"/>",
  siren: "<path d=\"M6 18v-6a6 6 0 0 1 12 0v6\"/><path d=\"M4 18h16v3H4zM12 3v2M4.5 6l1.5 1.5M19.5 6L18 7.5\"/>",
  shield: "<path d=\"M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z\"/><path d=\"M8.5 12l2.5 2.5 4.5-5\"/>",
  radar: "<path d=\"M12 3l8.5 6.2-3.3 10H6.8L3.5 9.2z\"/><path d=\"M12 8l3.5 2.6-1.3 4H9.8l-1.3-4z\"/>",
  moon: "<path d=\"M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z\"/>",
  cpu: "<rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2\"/><rect x=\"9.5\" y=\"9.5\" width=\"5\" height=\"5\"/><path d=\"M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4\"/>",
  smile: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01\"/>",
  news: "<rect x=\"3\" y=\"5\" width=\"15\" height=\"15\" rx=\"2\"/><path d=\"M18 9h3v9a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4\"/>",
  wind: "<path d=\"M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8\"/>",
  drop: "<path d=\"M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z\"/>",
  cloud: "<path d=\"M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 18z\"/>",
  lungs: "<path d=\"M12 4v8M12 12c-1.5-1-3 0-3 0V7c-2 0-5 4-5 9 0 2 1 3 2.5 3S9 17 9 15M12 12c1.5-1 3 0 3 0V7c2 0 5 4 5 9 0 2-1 3-2.5 3S15 17 15 15\"/>",
}

/** The emoji the prototype used, drawn with lucide at the same weight as ICONS. */
const LUCIDE: Record<LucideIconName, LucideIcon> = {
  accessibility: Accessibility, activity: Activity, ambulance: Ambulance, 'arrow-down': ArrowDown, ban: Ban, bean: Bean, bed: Bed,
  'bell-off': BellOff, 'biceps-flexed': BicepsFlexed, bone: Bone, 'book-open': BookOpen, bot: Bot, cake: Cake,
  calendar: Calendar, camera: Camera, candy: Candy, 'chart-column': ChartColumn, 'cigarette-off': CigaretteOff,
  'circle-check': CircleCheck, 'circle-help': CircleHelp, 'circle-x': CircleX, 'clipboard-list': ClipboardList,
  clock: Clock, 'cloud-moon': CloudMoon, 'cloud-rain': CloudRain, 'cloud-sun': CloudSun, coffee: Coffee,
  compass: Compass, 'cooking-pot': CookingPot, 'door-stairwell': DoorStairwell, droplets: Droplets,
  dumbbell: Dumbbell, 'fast-forward': FastForward, flame: Flame, 'flask-conical': FlaskConical, folder: Folder,
  footprints: Footprints, glasses: Glasses, hand: Hand, handshake: Handshake, headphones: Headphones,
  'heart-crack': HeartCrack, 'heart-handshake': HeartHandshake, 'heart-pulse': HeartPulse, info: Info, leaf: Leaf,
  lightbulb: Lightbulb, lock: Lock, 'map-pin': MapPin, meh: Meh, 'message-circle': MessageCircle,
  'notebook-pen': NotebookPen, 'notebook-text': NotebookText, 'octagon-x': OctagonX, package: Package,
  'party-popper': PartyPopper, 'pen-line': PenLine, 'person-standing': PersonStanding, 'phone-off': PhoneOff,
  plane: Plane, 'plug-zap': PlugZap, receipt: Receipt, 'refresh-cw': RefreshCw, ruler: Ruler, scale: Scale,
  settings: Settings, share: Share, 'sliders-horizontal': SlidersHorizontal, smartphone: Smartphone, sofa: Sofa,
  sparkles: Sparkles, speech: Speech, sprout: Sprout, stethoscope: Stethoscope, 'sun-dim': SunDim, sunrise: Sunrise,
  syringe: Syringe, telescope: Telescope, thermometer: Thermometer, 'thermometer-sun': ThermometerSun,
  'thumbs-up': ThumbsUp, timer: Timer, 'triangle-alert': TriangleAlert, turtle: Turtle, tv: Tv, type: Type,
  'user-round': UserRound, users: Users, utensils: Utensils, 'volume-2': Volume2, 'volume-x': VolumeX, waves: Waves,
  wheat: Wheat, wine: Wine,
}

const DOT: Record<DotIconName, string> = { 'dot-green': 'var(--good)', 'dot-amber': 'var(--warn)', 'dot-red': 'var(--bad)' }

type Hue = 'red' | 'rose' | 'orange' | 'amber' | 'green' | 'blue' | 'indigo' | 'purple' | 'slate'

const HUES: Record<Hue, readonly IconName[]> = {
  red: ['heart', 'heart-pulse', 'heart-crack', 'siren', 'ambulance', 'hospital', 'clinic', 'octagon-x', 'ban', 'circle-x', 'map-pin', 'target'],
  rose: ['heart-handshake', 'wine', 'cake'],
  orange: ['flame', 'thermometer', 'thermometer-sun', 'activity', 'dumbbell', 'biceps-flexed', 'utensils', 'cooking-pot', 'coffee'],
  amber: ['sun', 'sunrise', 'sun-dim', 'cloud-sun', 'lightbulb', 'triangle-alert', 'bolt', 'sparkles', 'spark', 'party-popper', 'bell', 'candy', 'wheat', 'plug-zap', 'thumbs-up'],
  green: ['leaf', 'sprout', 'tree', 'circle-check', 'check', 'footprints', 'person-standing', 'turtle', 'accessibility', 'shield', 'smile', 'door-stairwell'],
  blue: ['drop', 'droplets', 'waves', 'cloud', 'cloud-rain', 'wind', 'lungs', 'phone', 'smartphone', 'message-circle', 'speech', 'mic', 'headphones', 'ear', 'volume-2', 'plane', 'info'],
  indigo: ['moon', 'bed', 'cloud-moon', 'sofa', 'timer', 'clock', 'calendar', 'fast-forward', 'pause', 'play'],
  purple: ['pill', 'brain', 'syringe', 'flask-conical', 'stethoscope', 'telescope', 'bean', 'bone', 'eye'],
  slate: ['arrow-down', 'lock', 'settings', 'user-round', 'users', 'people', 'hand', 'clipboard-list', 'file', 'folder', 'receipt', 'notebook-pen', 'notebook-text', 'pen-line',
    'ruler', 'scale', 'type', 'tv', 'glasses', 'package', 'book-open', 'news', 'camera', 'volume-x', 'bell-off', 'phone-off', 'meh', 'cigarette-off', 'refresh-cw',
    'sliders-horizontal', 'circle-help', 'share'],
}
const HUE = new Map(Object.entries(HUES).flatMap(([hue, names]) => names.map((n) => [n, hue] as const)))

/** The colour an icon takes when it stands for something (heart red, water blue); unlisted icons use the brand teal. */
export const hueOf = (name: IconName): string => `var(--hue-${HUE.get(name) ?? 'teal'})`

const isLucide = (name: IconName): name is LucideIconName => name in LUCIDE
const isDot = (name: IconName): name is DotIconName => name in DOT

/**
 * Same svg as the prototype's `paint()`. Wrap it in `<span className="ic">` where
 * the prototype used `<span class="ic" data-ic>`. Names without a path (the
 * prototype's `watch`) render nothing, as the prototype does. `tint` colours it by meaning
 * (where an emoji stood); without it the icon takes the text colour, as nav and buttons need.
 */
export function Icon({ name, tint }: { name: IconName; tint?: boolean }) {
  const style = tint ? { color: hueOf(name) } : undefined
  if (isLucide(name)) {
    const Lucide = LUCIDE[name]
    return <Lucide strokeWidth={1.8} aria-hidden="true" style={style} />
  }
  if (isDot(name)) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="6" fill={DOT[name]} />
      </svg>
    )
  }
  const inner = ICONS[name]
  if (!inner) return null
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  )
}

/**
 * An icon set inline before text, where the prototype put an emoji: `<Glyph name="pill" />Tablets`. Coloured by meaning
 * through `--gl`, so a filled button can hand it its own text colour instead (globals.css `.gl`).
 */
export function Glyph({ name }: { name: IconName }) {
  return <span className="ic gl" style={{ '--gl': hueOf(name) } as CSSProperties}><Icon name={name} /></span>
}
