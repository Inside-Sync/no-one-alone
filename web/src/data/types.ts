/**
 * Domain types for "No One Alone". Every figure is fictional.
 * Types are named after the page section they serve; field order follows the
 * arrays in tests/fixtures/prototype.html so fixtures can be diffed against it.
 * Tuples (`[label, value]`) are used only where the prototype itself is a
 * two-column label/value list (packet rows).
 */

/* ---------- shared primitives ---------- */

/** The only person whose data the individual view shows. */
export type SubjectId = 'margaret'

/** People Margaret can share with (PEOPLE2 in the prototype). */
export type PersonId = 'james' | 'sarah' | 'david' | 'priya' | 'gp' | 'hosp'

/** The 11 consent categories (CATS in the prototype). */
export type CategoryId =
  | 'safety'
  | 'checkin'
  | 'heart'
  | 'sleep'
  | 'activity'
  | 'mood'
  | 'meds'
  | 'speech'
  | 'home'
  | 'records'
  | 'location'

/** Status colour of a metric (maps to --good / --warn / --bad). */
export type Severity = 'good' | 'warn' | 'bad'

/** `.pill` modifier classes used by the prototype. */
export type PillTone = 'good' | 'warn' | 'bad' | 'plain' | 'brand'

export type StatusLevel = 'good' | 'watch' | 'alert'

/** Icon keys from the prototype's ICONS table (dot-ic attribute values). */
export type DrawnIconName =
  | 'home' | 'spark' | 'tree' | 'file' | 'bell' | 'bolt' | 'mic' | 'heart' | 'right' | 'left'
  | 'trend' | 'pill' | 'people' | 'ear' | 'eye' | 'brain' | 'plus' | 'minus' | 'clinic' | 'hospital'
  | 'phone' | 'pause' | 'play' | 'check' | 'x' | 'grid' | 'sun' | 'search' | 'target'
  | 'siren' | 'shield' | 'radar' | 'moon' | 'cpu' | 'smile' | 'news' | 'wind' | 'drop'
  | 'cloud' | 'lungs' | 'watch'

/** lucide-react icons, by their lucide name; they stand in for the prototype's emoji. */
export type LucideIconName =
  | 'accessibility' | 'activity' | 'ambulance' | 'arrow-down' | 'ban' | 'bean' | 'bed' | 'bell-off' | 'biceps-flexed'
  | 'bone' | 'book-open' | 'bot' | 'cake' | 'calendar' | 'camera' | 'candy' | 'chart-column'
  | 'cigarette-off' | 'circle-check' | 'circle-help' | 'circle-x' | 'clipboard-list' | 'clock'
  | 'cloud-moon' | 'cloud-rain' | 'cloud-sun' | 'coffee' | 'compass' | 'cooking-pot' | 'door-stairwell'
  | 'droplets' | 'dumbbell' | 'fast-forward' | 'flame' | 'flask-conical' | 'folder' | 'footprints'
  | 'glasses' | 'hand' | 'handshake' | 'headphones' | 'heart-crack' | 'heart-handshake' | 'heart-pulse'
  | 'info'
  | 'leaf' | 'lightbulb' | 'lock' | 'map-pin' | 'meh' | 'message-circle' | 'notebook-pen' | 'notebook-text'
  | 'octagon-x' | 'package' | 'party-popper' | 'pen-line' | 'person-standing' | 'phone-off' | 'plane'
  | 'plug-zap' | 'receipt' | 'refresh-cw' | 'ruler' | 'scale' | 'settings' | 'share' | 'sliders-horizontal'
  | 'smartphone' | 'sofa' | 'sparkles' | 'speech' | 'sprout' | 'stethoscope' | 'sun-dim' | 'sunrise'
  | 'syringe' | 'telescope' | 'thermometer' | 'thermometer-sun' | 'thumbs-up' | 'timer' | 'triangle-alert'
  | 'turtle' | 'tv' | 'type' | 'user-round' | 'users' | 'utensils' | 'volume-2' | 'volume-x' | 'waves'
  | 'wheat' | 'wine'

/** A traffic-light dot (green / amber / red status). */
export type DotIconName = 'dot-green' | 'dot-amber' | 'dot-red'

export type IconName = DrawnIconName | LucideIconName | DotIconName

/** A KPI tile (`.kpi`): label, big value + unit, sparkline, baseline and delta. */
export interface Kpi {
  /** Icon before the label; only the plain-language individual tiles have one. */
  icon?: IconName
  /** Language-independent id of a tile a stored document overrides (`restingHr`); never shown. */
  key?: string
  label: string
  /** Key into `common:explain` for the drawer text; the label is translated, this is not. */
  explain?: string
  value: string
  unit: string
  /** Sparkline / dot colour (hex). */
  color: string
  baseline: string
  delta: string
  /** Colour of `delta`. The prototype's empty string means good. */
  tone: Severity
  spark: number[]
}

/** A `.mini > div` cell: small label, bold value, one-line note. */
export interface MiniStat {
  /** Icon before the label, where the prototype had an emoji. */
  icon?: IconName
  label: string
  /** Key into `common:explain` for the drawer text; the label is translated, this is not. */
  explain?: string
  value: string
  note: string
  /** Colour of `note`; undefined means muted. */
  tone?: Severity
}

/** A context-bar fact chip (`#facts`). */
export interface ContextFact {
  /** The first fact in each bar carries the pulsing dot. */
  live: boolean
  label: string
  value: string
}

export interface ContextBar {
  initials: string
  color: string
  sub: string
  facts: ContextFact[]
}

/** A plain label/value row: packet rows, `.kv` lists. */
export type LabelValue = [label: string, value: string]

/* ---------- Person (margaret.ts) ---------- */

export interface Condition {
  icon: IconName
  title: string
  since: string
  /** "Right now" status line. */
  now: string
  color: string
  detail: string
}

export interface ProfileRow {
  /** Icon shown before the label. */
  icon: IconName
  label: string
  value: string
  /** Language-independent id of a row a stored document overrides (`age`, `gender`); never shown. */
  key?: string
}

export interface DayLineEntry {
  time: string
  icon?: IconName
  text: string
  /** 'w' = warning dot, 'n' = next (upcoming); undefined = normal. */
  flag?: 'w' | 'n'
}

export interface TodayCard {
  updated: string
  headline: string
  devices: { label: string; value: string }[]
  /** 'chat' opens the agent drawer; 'call' shows `toast`. */
  actions: { label: string; icon?: IconName; toast?: string; kind: 'chat' | 'call' }[]
}

export interface OwnTile {
  icon: IconName
  title: string
  note: string
  warn?: boolean
}

export interface OwnIdea {
  icon: IconName
  title: string
  note: string
  yes: { label: string; toast: string; done: string }
  no: { label: string; toast: string; done: string }
}

export interface AccessLogEntry {
  when: string
  who: string
  what: string
  why: string
}

/** Margaret's own app pages: "My day" and "Who sees what" copy. */
export interface OwnView {
  greeting: string
  sub: string
  tiles: OwnTile[]
  ideas: OwnIdea[]
  promise: { icon: IconName; lead: string; text: string }[]
  accessLog: AccessLogEntry[]
  privacy: {
    presets: { id: 'family' | 'safety' | 'all'; icon: IconName; label: string }[]
    safetyNote: string
    safetyIcon: IconName
    emergency: { agreed: string; text: string; buttons: { label: string; toast: string; done: string }[] }
  }
}

/** A row of "What the helper did today" (`#audit`). */
export interface HelperLogEntry {
  time: string
  what: string
  /** "How" column, e.g. 'Did it', 'Needs your OK'. */
  how: string
  why: string
  result: string
  tone: PillTone
  /** The helper only watched (a pill in the quiet tone); set in the data so it holds in any language. */
  passive?: boolean
  /** Row needs approval: the result cell shows an Approve button. */
  needsApproval: boolean
}

export interface Person {
  id: SubjectId
  name: string
  initials: string
  /** Avatar colour. */
  color: string
  nickname: string
  born: string
  age: number
  gender: string
  suburb: string
  postcode: string
  heightCm: number
  weightKg: number
  bmi: number
  bloodType: string
  /** Display text, e.g. 'Walking stick outdoors'. */
  mobilityAid: string
  /** Display text, e.g. 'Aids, both ears'. */
  hearingAids: string
  /** Display text, e.g. 'Advance care plan on file'. */
  advanceCarePlan: string
  allergies: string[]
  medicineCount: number
  conditions: Condition[]
  status: StatusLevel
  /** e.g. 'Last chat 13:02 · cheerful'. */
  lastChat: string
  devices: { wearableBattery: number; hubSensors: number }
  /** `#profile` card. */
  profile: {
    checkedBy: string
    shareToast: string
    rows: ProfileRow[]
    /** The five lifestyle / allergy chips under the conditions. */
    chips: { icon: IconName; text: string; danger?: boolean }[]
  }
  today: TodayCard
  dayline: DayLineEntry[]
  /** Context bar under the nav (MAR in the prototype, final state). */
  context: ContextBar
  /** Plain-language KPI tiles shown in the individual view (final state). */
  kpis: Kpi[]
  /** The original technical KPI tiles (`KP`), kept for reference. */
  kpisTechnical: Kpi[]
  /** "What the helper did today", plain-language version (the one shown). */
  helperLog: HelperLogEntry[]
  /** Original technical version of the same log, kept for reference. */
  helperLogTechnical: HelperLogEntry[]
  ownView: OwnView
}

/* ---------- Health (health.ts) ---------- */

export interface GoalGauge {
  label: string
  value: number
  goal: number
  unit: string
  color: string
}

export interface HealthGroup {
  icon: IconName
  title: string
  metrics: MiniStat[]
  /** Consent category the card is tagged with (`data-scat`). */
  category: CategoryId
}

export interface Hr24 {
  /** 289 five-minute samples, 15:00 yesterday to 15:00 today. */
  points: number[]
  /** Min-max band around each sample. */
  band: { hi: number[]; lo: number[] }
  alerts: { index: number; label: string }[]
  walk: { index: number; value: number; label: string }
  axisLabels: string[]
  asleepFrom: number
  asleepTo: number
}

export interface HypnogramSegment {
  /** 0 awake, 1 dream (REM), 2 light (core), 3 deep. */
  stage: 0 | 1 | 2 | 3
  minutes: number
}

export interface HealthData {
  goals: GoalGauge[]
  goalTotals: MiniStat[]
  hr24: Hr24
  groups: HealthGroup[]
  hypnogram: { title: string; stageNames: string[]; legend: string[]; segments: HypnogramSegment[]; axisLabels: { text: string; at: number }[] }
  mood14: {
    /** -1..1 pleasant to unpleasant, oldest first. */
    values: number[]
    hotDays: number[]
    walkDays: number[]
    tags: { tone: PillTone; text: string }[]
  }
  steps14: number[]
  stepsGoal: number
  bp14: { morning: number[]; evening: number[]; target: number }
}

/* ---------- Surroundings (around.ts) ---------- */

export interface MapPin {
  name: string
  /** Second line under the name (prototype `sub`). */
  sub?: string
  /** Detail shown on tap (prototype `d`). */
  detail?: string
  /** Rendered as a flat arrow tag instead of a ball pin. */
  tag?: boolean
  color: string
  initials: string
  /** Pin ink colour when the pin is white. */
  ink?: string
  /** Large home pin. */
  big?: boolean
  /** Static map coordinates (x, y, z) when the prototype fixes them. */
  at?: { x: number; y: number; z: number }
  phase?: number
  /** Real-world position for the Google map (deterministic; no randomness). */
  geo?: { lat: number; lng: number }
  /** Google map marker category and (for alerts) severity tone. */
  kind?: 'home' | 'family' | 'health' | 'community' | 'alert'
  tone?: 'act' | 'watch' | 'info'
}

export interface WeatherDay {
  day: string
  icon: 'sun' | 'wind' | 'cloud' | 'drop'
  high: number
  low: number
  hot: boolean
}

export type NewsCategory = 'Health' | 'Safety' | 'Weather' | 'Community' | 'Transport'

export interface NewsItem {
  category: NewsCategory
  source: string
  /** e.g. '2 h' (the UI appends ' ago'). */
  age: string
  headline: string
  body: string
  shownBecause: string
}

export type AlertSeverity = 'act' | 'aware' | 'help' | 'done'

export interface WatchAlert {
  severity: AlertSeverity
  icon: IconName
  title: string
  text: string
  source: string
}

export interface AirDay {
  day: string
  quality: string
  pm25: string
  pollen: string
  smoke: string
  advice: string
  tone: PillTone
}

export interface Surroundings {
  /** Home page map card. */
  homeMap: {
    /** Icon before the kicker. */
    icon: IconName
    kicker: string
    title: string
    detail: string
    lat: number
    lng: number
    address: string
    legend: { color: string; label: string; ring?: boolean; round?: boolean }[]
    chips: { icon: IconName; text: string }[]
    ariaLabel: string
    pins: MapPin[]
    walkRing: { label: string; radius: number }
    labels: { text: string; x: number; y: number; bold?: boolean }[]
  }
  /** Surroundings page map card. */
  watchMap: {
    /** Icon before the kicker. */
    icon: IconName
    kicker: string
    title: string
    detail: string
    ariaLabel: string
    legend: { color: string; label: string }[]
    ring: { label: string; radius: number }
  }
  pins: MapPin[]
  weather: {
    icon: IconName
    heading: string
    meta: string
    temp: string
    summary: string
    feelsLike: string
    stats: MiniStat[]
    note: string
  }
  week: WeatherDay[]
  kpis: Kpi[]
  alertsHeading: { icon: IconName; title: string; meta: string }
  alerts: WatchAlert[]
  newsHeading: { icon: IconName; title: string; meta: string }
  newsCategories: ('All' | NewsCategory)[]
  news: NewsItem[]
  thursday: {
    /** 17 hourly values, 06:00 to 22:00. */
    outdoor: number[]
    indoor: number[]
    coolRoom: { from: number; to: number; label: string }
    plan: { at: number; label: string }[]
    legend: { color: string; label: string }[]
  }
  air: AirDay[]
  airNote: string
}

/* ---------- Lineage (lineage.ts) ---------- */

export type ConditionKey = 'HTN' | 'STR' | 'AF' | 'T2D' | 'GLA' | 'DEM' | 'HEAR'

export interface LineageCondition {
  name: string
  color: string
}

export interface LineageNode {
  /** Family member id (the Firestore `families` member), so a live document can reuse the designed name. */
  id?: string
  name: string
  sub: string
  /** [condition, age at onset or reading]. */
  conditions: [ConditionKey, number | string][]
  kind?: 'dec' | 'focus' | 'you'
}

export interface LineageGeneration {
  label: string
  nodes: LineageNode[]
}

export interface StrengthRow {
  condition: string
  /** Filled dots out of 4. */
  dots: 0 | 1 | 2 | 3 | 4
  label: string
}

export interface ScreeningRow {
  check: string
  interval: string
  due: string
  tone: PillTone
  /** Button label; empty when there is no action. */
  action: string
}

export interface LineageMatrixRow {
  person: string
  /** Age at onset by condition; a missing key means not affected / not shared. */
  onset: Partial<Record<ConditionKey, number | string>>
}

export interface Lineage {
  heading: string
  meta: string
  conditionKeys: Record<ConditionKey, LineageCondition>
  legendNote: string
  generations: LineageGeneration[]
  strengthHeading: string
  strength: StrengthRow[]
  strengthNote: string
  screeningHeading: { title: string; meta: string }
  screening: ScreeningRow[]
  screeningToast: string
  matrixColumns: ConditionKey[]
  matrix: LineageMatrixRow[]
  consent: {
    columns: string[]
    /** One row per relative; `shares` aligns with `columns`. */
    rows: { person: string; shares: boolean[] }[]
    note: string
  }
  context: ContextBar
}

/* ---------- Care record (record.ts) ---------- */

export type EncounterType = 'GP' | 'Specialist' | 'Pathology' | 'Emergency' | 'Hearing'

export interface EncounterTrack {
  type: EncounterType
  color: string
  count: number
  /** Month offsets since Jan 2023 (0..46), one per encounter. */
  months: number[]
}

export interface MedicineRow {
  name: string
  timing: string
  /** 30-day adherence percent. */
  adherence: number
  tone: Severity
  last: string
  /** Id of the chart entry the row opens ('' for none). */
  entry: string
}

export interface LabRow {
  name: string
  unit: string
  /** Last 4 results, oldest first. */
  values: [number, number, number, number]
  /** Reference range [low, high]. */
  reference: [number, number]
  /** Chart axis range. */
  axis: [number, number]
  note: string
}

/** A text that reads differently in Moza's own app (`self`) and for family (`family`). */
export interface Voiced {
  self: string
  family: string
}

export type CareStage = 'his' | 'bef' | 'sym' | 'res' | 'tx' | 'rec'

/** One of the 23 chart entries of the whole case, in time order. */
export interface CareEntryData {
  id: string
  stage: CareStage
  kind: string
  when: string
  title: string
  where: string
  summary: string
  findings: [label: string, value: string][]
  related: string[]
  source: string
}

export interface SourceTime {
  source: string
  time: string
}

export interface CareRecord {
  status: string
  detail: string
  kpis: (Kpi & SourceTime)[]
  home: { title: Voiced; sub: Voiced } & SourceTime
  journey: SourceTime & {
    stages: { id: 'before' | 'symptoms' | 'results' | 'treatment' | 'recovery'; when: string; title: string; entry: string; items: string[] }[]
  }
  encounters: SourceTime & {
    meta: string
    types: EncounterTrack[]
    now: number
    markers: { month: number; label: string }[]
  }
  medicines: MedicineRow[]
  allergyNote: { allergen: string; detail: string; checked: string }
  medicinesPill: { tone: PillTone; text: string }
  medicinesSource: SourceTime
  history: {
    episodes: {
      id: string; when: string; title: string; where: string; badge: string; tone: PillTone
      detail: string; access: string; entry: string
    }[]
    source: string
    time: string
    holders: { tone: Severity; name: Voiced; text: Voiced }[]
    holdersSource: Voiced
    holdersTime: string
    family: { relative: string; conditions: string; consent: string; tone: PillTone }[]
    familySource: string
    familyTime: string
  }
  screening: {
    meta: string
    rows: { when: string; check: string; result: string; next: string; entry: string }[]
    source: string
    time: string
    signs: { ok: boolean; title: Voiced; note: string; entry: string }[]
    note: Voiced
    signsSource: string
    signsTime: string
  }
  results: SourceTime & {
    meta: string
    rows: { test: string; showed: string; when: string; entry: string }[]
  }
  labs: LabRow[]
  labsSource: SourceTime
  followUpReadings: SourceTime & {
    meta: string
    tiles: { label: string; value: string; unit: string; note: string; color: string; spark: number[] }[]
    note: Voiced
  }
  followUp: SourceTime & {
    days: { day: string; text: string; state: 'done' | 'planned'; entry: string }[]
    note: string
  }
  entries: CareEntryData[]
}

/* ---------- Device feed (device.ts) ---------- */

export interface DeviceRow {
  device: string
  metrics: string
  frequency: string
  status: string
  tone: PillTone
  sharedWith: string
}

export interface DeviceFeed {
  meta: string
  /** `#devices` table on the Health page. */
  sources: DeviceRow[]
  /** The "Her phone" page. */
  phone: {
    home: {
      date: string
      greeting: string
      medicine: { title: string; sub: string; button: string; toast: string }
      ok: { label: string; toast: string }
      help: { label: string }
    }
    heading: string
    meta: string
    minis: MiniStat[]
    bullets: { icon: IconName; text: string }[]
    note: string
  }
}

/* ---------- Care circle (circle.ts) ---------- */

export interface CircleMember {
  id: 'david' | 'james' | 'sarah' | 'priya' | 'aisha'
  initials: string
  color: string
  /** Plain-language name line, e.g. 'David · her brother'. */
  name: string
  icon: IconName
  note: string
  role: { tone: PillTone; text: string }
  /** Technical (pre-plain-language) name and note, kept for reference. */
  technicalName: string
  technicalNote: string
}

/** One ball in the 3D orbit (`CIRCLE`). */
export interface OrbitNode {
  id: 'david' | 'nurse' | 'james' | 'sarah' | 'hosp'
  name: string
  sub: string
  initials: string
  ring: 0 | 1 | 2
  /** Start angle in radians. */
  angle: number
  /** Radial gradient stops: highlight, body, shadow. */
  colors: [string, string, string]
  ink?: string
}

export interface OrbitRing {
  radius: number
  y: number
  speed: number
  dashed?: boolean
}

/** The centre ball of the orbit (Margaret) and its tap text. */
export interface OrbitCentre {
  initials: string
  /** Caption under the ball in calm mode ("Margaret, 78"). */
  label: string
  /** Tap toast: `${name} · ${calmSub | alertSub}`. */
  name: string
  calmSub: string
  alertSub: string
}

/** Everything the 3D care-circle orbit draws (`CIRCLE`, `RINGS`, line 1340). */
export interface OrbitScene {
  nodes: OrbitNode[]
  rings: OrbitRing[]
  centre: OrbitCentre
}

/** A person Margaret can share with (`PEOPLE2`). */
export interface SharePerson {
  id: PersonId
  name: string
  role: string
  color: string
  initials: string
  /** Emergency contact: safety alerts are locked on. */
  emergency: boolean
}

/* ---------- Consent store ---------- */

export type ShareMatrix = Record<PersonId, Record<CategoryId, boolean>>

export type AuditAction =
  | 'share-on'
  | 'share-off'
  | 'preset'
  | 'pause'
  | 'resume'
  | 'preview'
  | 'request'
  | 'view'

export interface AuditEntry {
  /** Display time, e.g. '15:10'. Never `Date.now()`. */
  at: string
  who: string
  action: AuditAction
  detail: string
  viewer?: PersonId
  category?: CategoryId
  on?: boolean
}

/* ---------- Hospital (hospital.ts) ---------- */

export interface IncomingRow {
  eta: string
  patient: string
  presenting: string
  triage: string
  triageTone: PillTone
  packet: boolean
  bed: string
}

export interface InboxMessage {
  name: string
  summary: string
  pill: { tone: PillTone; text: string }
}

export interface PathwayStep {
  text: string
  note: string
  /** Demo step index (0..9) from which the item is ticked; 7 = packet received. */
  doneFromStep: number
}

export interface HospitalData {
  context: ContextBar
  edKpis: Kpi[]
  inbox: InboxMessage[]
  /** Shown in the packet pane when an archived (already seen) inbox message is opened. */
  inboxArchivedNote: string
  /** Rows always shown in "Incoming ambulances". */
  incoming: IncomingRow[]
  /** Extra first row that arrives during the night alert demo. */
  incomingDemo: IncomingRow
  /** Demo inbox entry (step >= 7). */
  inboxDemo: { name: string; summary: string; summaryArriving: string }
  /** Final packet (Margaret), including the Patient row. */
  packet: LabelValue[]
  /** Example packet shown before the demo runs. */
  examplePacket: { patient: string; rows: LabelValue[] }
  pathway: PathwayStep[]
  pathwayWindow: { demo: string; idle: string }
}

/* ---------- 3D city model (city.ts) ---------- */

export type CityBlockKind = 'shops' | 'res' | 'res1' | 'park' | 'lib'

/** Camera preset of a City3D map (prototype `new City3D(el, o)` options). */
export interface CityView {
  /** Model footprint in model units [x, y]. */
  size: readonly [number, number]
  yaw: number
  /** Vertical position of the model centre as a share of the height. */
  cy: number
  vpad: number
  zmax: number
  fill: number
  compassY?: number
  pitch?: number
  zoom?: number
  /** Scale so the footprint covers the whole canvas (cropped at the edges) instead of fitting inside it. */
  cover?: boolean
  /** Allow the user zoom (+/− buttons, pinch, ctrl + wheel) on a view that is not a cover view. */
  zoomable?: boolean
}

/** Inputs of the procedural Marrickville model (`buildSuburb`, line 1270). */
export interface CityGeometry {
  /** [x0, x1, y0, y1, kind]. */
  blocks: readonly (readonly [number, number, number, number, CityBlockKind])[]
  wallColours: readonly string[]
  roofColours: readonly string[]
  shopWallColours: readonly string[]
  awningColours: readonly string[]
  ground: {
    slabTop: string
    slabSide: string
    river: string
    riverBank: string
    block: string
    park: string
    oval: readonly [string, string]
    road: string
    roadLight: string
    rail: string
    railLine: string
    laneMark: string
  }
  trees: {
    street: readonly [string, string]
    jacaranda: readonly [string, string]
    riverside: readonly [string, string]
  }
  /** `street`: the home map drawn from OpenStreetMap (`buildStreets`). */
  views: { home: CityView; watch: CityView; district: CityView; street: CityView }
}

export * from './government.types'
export * from './screening.types'
export * from './treatment.types'
export * from './patients.types'
export * from './overview.types'
