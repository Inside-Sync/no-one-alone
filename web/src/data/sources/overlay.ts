import type { CircleEntryDoc, FamilyDoc, ForecastDoc, HospitalDoc, LatLng, PersonDoc, RiskLevel } from '../contract'
import type {
  CircleMember, ConditionKey, Forecast, IconName, Lineage, LineageGeneration, LineageMatrixRow, OrbitScene, Person,
  ScreeningRow, Severity, SharePerson, StrengthRow,
} from '../types'
import i18n, { currentLanguage } from '@/i18n'

/**
 * Firestore wins: every field the contract stores replaces the prototype's value; everything else (copy, the
 * prototype-only figures) stays from the mock. Pure functions, so a missing document simply means "no overlay".
 * The words they add (roles, notes, labels) come from the `overlay` namespace via `i18n.t` at call time, in the language in use.
 */

/** The seed documents the overlays read: the older person, the members, and the hospitals. */
export interface Seed {
  person: PersonDoc
  members: Record<string, PersonDoc>
  hospitals: Record<string, HospitalDoc>
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const firstName = (s: string) => s.split(' ')[0]
/** A relation word from the seed (`son`, `neighbour`…) in the language in use; unknown words pass through. */
const relationOf = (r: string) => (i18n.t('overlay:relation', { returnObjects: true }) as Record<string, string>)[r] ?? r
const initialsOf = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

/** Great-circle distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

export const distanceLabel = (m: number) => {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`
  const km = (m / 1000).toFixed(1)
  return `${currentLanguage() === 'vi' ? km.replace('.', ',') : km} km` // the other languages keep the dot
}

/** `Australia/Melbourne` → `Melbourne`. */
export const cityOf = (tz?: string) => (tz ? tz.split('/').pop()!.replace(/_/g, ' ') : '')

/** `14 Wilga Street, Marrickville NSW 2204 (fictional)` → suburb and postcode. */
export function parseAddress(text?: string): { suburb: string; postcode: string } | null {
  const m = text?.match(/,\s*([^,]+?)\s+[A-Z]{2,3}\s+(\d{4})/)
  return m ? { suburb: m[1], postcode: m[2] } : null
}

/** Where a member is, as the circle cards say it: distance for NEARBY, city for DISTANT. */
function placeOf(seed: Seed, entry: CircleEntryDoc): string {
  const m = seed.members[entry.memberId]
  if (entry.role === 'NEARBY' && m?.location && seed.person.location) return distanceLabel(distanceM(seed.person.location, m.location))
  return cityOf(m?.timezone)
}

const nameOf = (seed: Seed, id: string) => seed.members[id]?.displayName ?? cap(id)

const byPriority = (seed: Seed) => [...(seed.person.circle ?? [])].sort((a, b) => a.priority - b.priority)

/* ---------- Person ---------- */

export function overlayPerson(p: Person, doc: PersonDoc): Person {
  const addr = parseAddress(doc.addressText)
  const gender = doc.sex === 'F' ? i18n.t('overlay:person.female') : doc.sex === 'M' ? i18n.t('overlay:person.male') : p.gender
  // The mock's row labels are in the language in use, so match them in that language.
  const ageLabel = i18n.t('overlay:person.ageLabel')
  const genderLabel = i18n.t('overlay:person.genderLabel')
  const restingHrLabel = i18n.t('overlay:person.restingHrLabel')
  const age = doc.age ?? p.age
  return {
    ...p,
    name: doc.displayName,
    initials: initialsOf(doc.displayName),
    age,
    gender,
    suburb: addr?.suburb ?? p.suburb,
    postcode: addr?.postcode ?? p.postcode,
    profile: {
      ...p.profile,
      rows: p.profile.rows.map((r) => (r.label === ageLabel ? { ...r, value: String(age) } : r.label === genderLabel ? { ...r, value: gender } : r)),
    },
    kpisTechnical: doc.baseline
      ? p.kpisTechnical.map((k) => (k.label === restingHrLabel ? { ...k, baseline: i18n.t('overlay:person.restingHrBase', { n: doc.baseline!.restingHr }) } : k))
      : p.kpisTechnical,
  }
}

/* ---------- Care circle ---------- */

const CIRCLE_IDS = new Set<string>(['david', 'james', 'sarah', 'priya', 'aisha'])
const SHARE_IDS = new Set<string>(['james', 'sarah', 'david', 'priya', 'gp', 'hosp'])
const PALETTE = ['#2f6fb0', '#e07a3f', '#c2417a', '#8a6bd1', '#c2611f', '#0b7f71']

/**
 * Circle members in Firestore priority order, then the prototype-only ones (e.g. the nurse). A member id the UI's
 * consent model has no row for is left out (the share matrix is keyed by a closed set of viewers).
 */
export function overlayCircle(mock: CircleMember[], seed: Seed, viewer: string): CircleMember[] {
  const entries = byPriority(seed)
  const num = seed.person.emergencyNumber ?? '000'
  const firstNearby = entries.find((e) => e.role === 'NEARBY')?.memberId
  const fromDoc = entries.filter((e) => CIRCLE_IDS.has(e.memberId)).map((e, i): CircleMember => {
    const base = mock.find((m) => m.id === e.memberId)
    const name = nameOf(seed, e.memberId)
    const place = placeOf(seed, e)
    const emoji = base?.name.split(' ')[0] ?? '🙂'
    const relation = relationOf(e.relation)
    const who = e.memberId === viewer ? i18n.t('overlay:you') : relation
    const note = e.role === 'NEARBY'
      ? i18n.t('overlay:circle.noteNearby', { place, order: e.memberId === firstNearby ? i18n.t('overlay:circle.firstToCall') : i18n.t('overlay:circle.nextToCall') })
      : e.criticalAlerts ? i18n.t('overlay:circle.noteCalls', { place, num }) : i18n.t('overlay:circle.noteUpdates', { place })
    const role: CircleMember['role'] = e.role === 'NEARBY'
      ? e.memberId === firstNearby ? { tone: 'good', text: i18n.t('overlay:circle.onCall') } : { tone: 'plain', text: i18n.t('overlay:circle.backup') }
      : e.criticalAlerts ? { tone: 'brand', text: i18n.t('overlay:circle.calls', { num }) } : { tone: 'plain', text: i18n.t('overlay:circle.updates') }
    return {
      id: e.memberId as CircleMember['id'],
      initials: initialsOf(name),
      color: base?.color ?? PALETTE[i % PALETTE.length],
      name: `${emoji} ${name} · ${who}`,
      note,
      role,
      technicalName: `${name} · ${relation}`,
      technicalNote: note,
    }
  })
  const listed = new Set(fromDoc.map((m) => m.id))
  return [...fromDoc, ...mock.filter((m) => !listed.has(m.id) && !seed.members[m.id])]
}

/** Share rows: role and emergency flag from the circle; the prototype's GP, nurse and hospital rows stay. */
export function overlaySharePeople(mock: SharePerson[], seed: Seed): SharePerson[] {
  const entries = byPriority(seed).filter((e) => SHARE_IDS.has(e.memberId))
  return mock.map((p) => {
    const e = entries.find((x) => x.memberId === p.id)
    if (!e) return p
    const name = nameOf(seed, e.memberId)
    return { ...p, name, initials: initialsOf(name), role: `${cap(relationOf(e.relation))} · ${placeOf(seed, e)}`, emergency: Boolean(e.criticalAlerts) }
  }) satisfies SharePerson[]
}

/** The stroke-ready hospital the agent would pick (nearest with `strokeReady`), with its straight-line distance. */
export function strokeCentre(seed: Seed): { id: string; doc: HospitalDoc; distance: number } | null {
  const from = seed.person.location
  if (!from) return null
  return Object.entries(seed.hospitals)
    .filter(([, h]) => h.strokeReady)
    .map(([id, doc]) => ({ id, doc, distance: distanceM(from, doc.location) }))
    .sort((a, b) => a.distance - b.distance)[0] ?? null
}

export function overlayOrbit(mock: OrbitScene, seed: Seed, viewer: string): OrbitScene {
  const entries = seed.person.circle ?? []
  const hosp = strokeCentre(seed)
  const name = firstName(seed.person.displayName)
  return {
    ...mock,
    nodes: mock.nodes.map((n) => {
      if (n.id === 'hosp') return hosp ? { ...n, name: hosp.doc.name.replace(/\s*\(demo\)$/, ''), sub: distanceLabel(hosp.distance) } : n
      const e = entries.find((x) => x.memberId === n.id)
      if (!e) return n
      const member = nameOf(seed, e.memberId)
      return { ...n, name: member, initials: initialsOf(member), sub: `${cap(relationOf(e.relation))} · ${placeOf(seed, e)}${n.id === viewer ? i18n.t('overlay:youParen') : ''}` }
    }),
    centre: {
      ...mock.centre,
      initials: initialsOf(name),
      name,
      label: seed.person.age ? `${name}, ${seed.person.age}` : name,
    },
  }
}

/* ---------- Forecast ---------- */

/**
 * The mock row a stored risk replaces, by its display name in the language in use (the mock data is localised, so
 * `Stroke` is `Đột quỵ` in Vietnamese); conditions without a row get a new one under their own name.
 */
const riskRowName = (condition: string) =>
  (i18n.t('overlay:forecast.risk', { returnObjects: true }) as Record<string, string>)[condition] ?? cap(condition.toLowerCase().replace(/_/g, ' '))
const LEVEL_TONE: Record<RiskLevel, Severity> = { HIGH: 'bad', MEDIUM: 'warn', LOW: 'good' }
const levelOf = (l: RiskLevel): [string, Severity] => [i18n.t(`overlay:forecast.level.${l}`), LEVEL_TONE[l]]
const REASON_ICONS: IconName[] = ['trend', 'pill', 'tree']

/** Weekly means of the daily points (last `weeks` full or partial weeks ending at the last point). */
function weekly(values: number[], weeks: number): number[] {
  const out: number[] = []
  for (let end = values.length; end > 0 && out.length < weeks; end -= 7) {
    const chunk = values.slice(Math.max(0, end - 7), end)
    out.unshift(Math.round((chunk.reduce((a, b) => a + b, 0) / chunk.length) * 10) / 10)
  }
  return out
}

function overlayBp(bp: Forecast['bp'], doc: ForecastDoc): Forecast['bp'] {
  const observedDaily = doc.series.flatMap((p) => (p.systolic !== undefined ? [p.systolic] : []))
  const forecastDaily = doc.series.flatMap((p) => (p.systolicForecast !== undefined ? [p.systolicForecast] : []))
  if (observedDaily.length === 0) return bp
  const observed = weekly(observedDaily, bp.observed.length)
  const today = observed[observed.length - 1]
  const ahead = bp.projectedNothing.length - 1
  const projectedNothing = forecastDaily.length
    ? [today, ...weekly(forecastDaily, Math.ceil(forecastDaily.length / 7)).slice(0, ahead)]
    : bp.projectedNothing
  // 100% adherence is not stored: keep the prototype's relative drop, anchored at today's value.
  const shift = today - bp.projectedAdherent[0]
  const projectedAdherent = bp.projectedAdherent.map((v) => Math.round((v + shift) * 10) / 10)
  const all = [...observed, ...projectedNothing, ...projectedAdherent, ...doc.series.flatMap((p) => (p.upper !== undefined ? [p.upper] : []))]
  return {
    ...bp,
    observed,
    projectedNothing,
    projectedAdherent,
    weeks: observed.length + projectedNothing.length - 1,
    todayWeek: observed.length,
    lo: Math.min(bp.lo, Math.floor(Math.min(...all) / 5) * 5 - 5),
    hi: Math.max(bp.hi, Math.ceil(Math.max(...all) / 5) * 5 + 5),
  }
}

export function overlayForecast(f: Forecast, doc: ForecastDoc, seed: Seed | null): Forecast {
  const risks = [...f.risks]
  for (const r of doc.risks) {
    const [level, tone] = levelOf(r.level)
    const name = riskRowName(r.condition)
    const i = risks.findIndex((x) => x.name === name)
    if (i >= 0) risks[i] = { ...risks[i], level, tone }
    else risks.push({ name, level, tone, trend: '→', reason: i18n.t('overlay:forecast.horizon', { n: r.horizonDays }) })
  }
  const owner = doc.action?.ownerMemberId && seed ? nameOf(seed, doc.action.ownerMemberId) : null
  const actions = doc.action
    ? [{ ...f.comingUp.actions[0], label: doc.action.text, value: owner ? i18n.t('overlay:forecast.sentTo', { name: owner }) : i18n.t('overlay:forecast.shared') }, ...f.comingUp.actions.slice(1)]
    : f.comingUp.actions
  return {
    ...f,
    risks,
    comingUp: {
      ...f.comingUp,
      reasons: doc.drivers.length ? doc.drivers.map((text, i) => ({ icon: REASON_ICONS[i % REASON_ICONS.length], text })) : f.comingUp.reasons,
      actions,
    },
    modelMeta: doc.method,
    bp: overlayBp(f.bp, doc),
  }
}

/* ---------- Lineage ---------- */

const CONDITION_KEY: [RegExp, ConditionKey][] = [
  [/hypertension|blood pressure/i, 'HTN'],
  [/stroke/i, 'STR'],
  [/atrial|fibrillation|\baf\b/i, 'AF'],
  [/diabet/i, 'T2D'],
  [/glaucoma/i, 'GLA'],
  [/dementia|alzheimer/i, 'DEM'],
  [/hearing/i, 'HEAR'],
]

const keyOf = (label: string) => CONDITION_KEY.find(([re]) => re.test(label))?.[1]

function generationLabel(diff: number, self: string): string {
  if (diff === -2) return i18n.t('overlay:lineage.generation.grandparents')
  if (diff === -1) return i18n.t('overlay:lineage.generation.parents')
  if (diff === 0) return i18n.t('overlay:lineage.generation.self', { name: self })
  if (diff === 1) return i18n.t('overlay:lineage.generation.children')
  if (diff === 2) return i18n.t('overlay:lineage.generation.grandchildren')
  return diff < 0 ? i18n.t('overlay:lineage.generation.ancestors') : i18n.t('overlay:lineage.generation.descendants')
}

export function overlayLineage(l: Lineage, doc: FamilyDoc, viewer: string): Lineage {
  if (doc.members.length === 0) return l
  const self = doc.members.find((m) => m.relation === 'self') ?? doc.members[0]
  const selfName = firstName(self.name)
  const conds = (m: FamilyDoc['members'][number]) =>
    m.conditions.flatMap((c): [ConditionKey, number | string][] => {
      const k = keyOf(c.label)
      return k ? [[k, c.ageAtOnset ?? '✓']] : []
    })
  const gens = [...new Set(doc.members.map((m) => m.generation))].sort((a, b) => a - b)
  const generations: LineageGeneration[] = gens.map((g) => ({
    label: generationLabel(g - self.generation, selfName),
    nodes: doc.members.filter((m) => m.generation === g).map((m) => {
      const kind = m.id === viewer ? 'you' : m.id === self.id ? 'focus' : m.deceased ? 'dec' : undefined
      const sub = `${m.deceased ? '† · ' : ''}${m.id === self.id ? i18n.t('overlay:lineage.herself') : relationOf(m.relation)}${m.id === viewer ? i18n.t('overlay:youSuffix') : ''}`
      return kind ? { name: m.name, sub, conditions: conds(m), kind } : { name: m.name, sub, conditions: conds(m) }
    }),
  }))
  const matrix: LineageMatrixRow[] = doc.members.map((m) => ({
    person: `${firstName(m.name)} (${m.id === self.id ? i18n.t('overlay:lineage.selfRow') : relationOf(m.relation)})`,
    onset: Object.fromEntries(conds(m)),
  }))
  const counts = new Map<ConditionKey, number>()
  for (const m of doc.members) for (const [k] of conds(m)) counts.set(k, (counts.get(k) ?? 0) + 1)
  const strength: StrengthRow[] = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({
    condition: l.conditionKeys[k].name,
    dots: Math.min(4, n) as StrengthRow['dots'],
    label: i18n.t(n >= 3 ? 'overlay:lineage.strength.strong' : n === 2 ? 'overlay:lineage.strength.moderate' : 'overlay:lineage.strength.weak'),
  }))
  const screening: ScreeningRow[] = doc.flags.map((f) => {
    const who = doc.members.find((m) => m.id === f.memberId)
    return { check: who ? `${f.screening} · ${firstName(who.name)}` : f.screening, interval: f.reason, due: i18n.t('overlay:lineage.dueNow'), tone: 'warn', action: i18n.t('overlay:lineage.book') }
  })
  const keys = l.matrixColumns.filter((k) => counts.has(k))
  return {
    ...l,
    generations,
    matrix,
    matrixColumns: keys.length ? keys : l.matrixColumns,
    strength: strength.length ? strength : l.strength,
    screening: screening.length ? screening : l.screening,
  }
}
