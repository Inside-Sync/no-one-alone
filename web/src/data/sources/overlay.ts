import type { CircleEntryDoc, ConditionCode, FamilyDoc, HospitalDoc, LatLng, PersonDoc } from '../contract'
import type {
  CircleMember, ConditionKey, Lineage, LineageGeneration, LineageMatrixRow, OrbitScene, Person,
  ScreeningRow, SharePerson, StrengthRow,
} from '../types'
import i18n from '@/i18n'

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
/** A place from a document in the language in use; an unknown place passes through. */
const placeName = (p: string) => (i18n.t('overlay:place', { returnObjects: true }) as Record<string, string>)[p] ?? p
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
  if (m < 1000) return i18n.t('overlay:distance.m', { n: Math.round(m / 10) * 10 })
  return i18n.t('overlay:distance.km', { n: (m / 1000).toFixed(1) }) // Latin digits with a dot in both languages
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
      rows: p.profile.rows.map((r) => (r.key === 'age' ? { ...r, value: String(age) } : r.key === 'gender' ? { ...r, value: gender } : r)),
    },
    kpisTechnical: doc.baseline
      ? p.kpisTechnical.map((k) => (k.key === 'restingHr' ? { ...k, baseline: i18n.t('overlay:person.restingHrBase', { n: doc.baseline!.restingHr }) } : k))
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
  const num = seed.person.emergencyNumber ?? '998'
  const firstNearby = entries.find((e) => e.role === 'NEARBY')?.memberId
  const fromDoc = entries.filter((e) => CIRCLE_IDS.has(e.memberId)).map((e, i): CircleMember => {
    const base = mock.find((m) => m.id === e.memberId)
    const name = nameOf(seed, e.memberId)
    const place = placeOf(seed, e)
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
      name: `${name} · ${who}`,
      icon: base?.icon ?? 'user-round',
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

/** The predict job's `code` for each condition the lineage has a column for; `null` is a known condition with no column. */
const CODE_KEY: Record<ConditionCode, ConditionKey | null> = {
  STROKE: 'STR', HYPERTENSION: 'HTN', TYPE_2_DIABETES: 'T2D', PREDIABETES: null, DEMENTIA: 'DEM', HEARING_LOSS: 'HEAR',
  ATRIAL_FIBRILLATION: 'AF', GLAUCOMA: 'GLA', CHRONIC_KIDNEY_DISEASE: null, OSTEOARTHRITIS: null,
}

/** `code` first; the English label's wording only for a document without a code (or one this app does not know). */
const keyOf = (c: { label: string; code?: string }): ConditionKey | undefined =>
  c.code !== undefined && c.code in CODE_KEY ? CODE_KEY[c.code as ConditionCode] ?? undefined : CONDITION_KEY.find(([re]) => re.test(c.label))?.[1]

/**
 * Labels as the design reads them for the viewer: the viewer's grandparents, the generation of the person the tree is
 * about, then the viewer's generation (that person's children) and below. Without a viewer below the person it is
 * counted from the person, as before.
 */
function generationLabel(g: number, self: FamilyDoc['members'][number], selfName: string, viewerGen: number | undefined): string {
  if (g === self.generation) return i18n.t('overlay:lineage.generation.self', { name: selfName })
  // The viewer is the person's child: the person's parents are the viewer's grandparents.
  const diff = g - self.generation - (viewerGen !== undefined && viewerGen > self.generation && g < self.generation ? 1 : 0)
  if (diff === -2) return i18n.t('overlay:lineage.generation.grandparents')
  if (diff === -1) return i18n.t('overlay:lineage.generation.parents')
  if (diff === 1) return i18n.t('overlay:lineage.generation.children')
  if (diff === 2) return i18n.t('overlay:lineage.generation.grandchildren')
  return diff < 0 ? i18n.t('overlay:lineage.generation.ancestors') : i18n.t('overlay:lineage.generation.descendants')
}

/** What each relation to the person the tree is about is, to a viewer who is that person's child: `relation:generations from the viewer`. */
const TO_VIEWER: Record<string, string> = {
  'father:-2': 'grandfather', 'mother:-2': 'grandmother',
  'self:-1': 'mother', 'husband:-1': 'father', 'brother:-1': 'uncle', 'sister:-1': 'aunt',
  'son:0': 'brother', 'brother:0': 'brother', 'daughter:0': 'sister', 'sister:0': 'sister',
  'grandson:1': 'son', 'granddaughter:1': 'daughter',
}

/** `i18n.t` for a key built at run time (the typed keys only cover literals). */
const tDyn = (key: string, opts?: object): string => String(i18n.t(key as never, opts as never))

const NO_AGE_MARK = '✓'
const NOTE_ONLY_MARK = '↑'

export function overlayLineage(l: Lineage, doc: FamilyDoc, viewer: string): Lineage {
  if (doc.members.length === 0) return l
  type Member = FamilyDoc['members'][number]
  const self = doc.members.find((m) => m.relation === 'self') ?? doc.members[0]
  const viewerM = doc.members.find((m) => m.id === viewer)
  const viewerGen = viewerM && viewerM.id !== self.id ? viewerM.generation : undefined
  const childOfSelf = viewerGen !== undefined && viewerGen === self.generation + 1
  // The designed (localized) name wins for a member the mock draws and the document knows as the designed family (a document with
  // ages, i.e. the new schema; an older one keeps its own names even if an id such as `james` coincides). Others keep the document's name.
  const designed = new Map(l.generations.flatMap((g) => g.nodes).filter((n) => n.id).map((n) => [n.id!, n.name]))
  const nameOfMember = (m: Member) => (m.age !== undefined || m.deceasedAge !== undefined ? designed.get(m.id) : undefined) ?? m.name
  const selfName = firstName(nameOfMember(self))

  /** `[chip, value]`: the age at onset, else the note (a reading), else a tick. */
  const conds = (m: Member) =>
    m.conditions.flatMap((c): [ConditionKey, number | string][] => {
      const k = keyOf(c)
      return k ? [[k, c.ageAtOnset ?? c.note ?? NO_AGE_MARK]] : []
    })

  const subOf = (m: Member): string => {
    const isSelf = m.id === self.id
    const detail = (m.deceased ? m.deceasedAge !== undefined : m.age !== undefined) || Boolean(m.place)
    const parts: string[] = []
    if (m.deceased) parts.push(m.deceasedAge !== undefined ? i18n.t('overlay:lineage.deceasedAge', { n: m.deceasedAge }) : i18n.t('overlay:lineage.deceased'))
    else if (m.age !== undefined) parts.push(String(m.age))
    // The relation is spelled out on the person's own side of the family; children and grandchildren show where they live.
    if (isSelf) {
      if (!detail) parts.push(i18n.t('overlay:lineage.herself'))
    } else if (m.generation <= self.generation || !detail) {
      const parent = (m.relation === 'father' || m.relation === 'mother') && m.generation === self.generation - 1
      parts.push(parent ? tDyn(`overlay:lineage.parentOf.${m.relation}`, { name: selfName }) : relationOf(m.relation))
    }
    if (m.place) parts.push(placeName(m.place))
    return parts.join(' · ') + (m.id === viewer ? i18n.t('overlay:youSuffix') : '')
  }

  const gens = [...new Set(doc.members.map((m) => m.generation))].sort((a, b) => a - b)
  const generations: LineageGeneration[] = gens.map((g) => ({
    label: generationLabel(g, self, selfName, viewerGen),
    nodes: doc.members.filter((m) => m.generation === g).map((m) => {
      const kind = m.id === viewer ? 'you' : m.id === self.id ? 'focus' : m.deceased ? 'dec' : undefined
      const node = { id: m.id, name: nameOfMember(m), sub: subOf(m), conditions: conds(m) }
      return kind ? { ...node, kind } : node
    }),
  }))

  /** The relation key as the viewer would say it ("father", "uncle") when the viewer is the person's child; otherwise none. */
  const viewerRelation = (m: Member): string | undefined =>
    childOfSelf && viewerGen !== undefined ? TO_VIEWER[`${m.relation}:${m.generation - viewerGen}`] : undefined
  const ORDER = ['grandfather', 'grandmother', 'father', 'mother', 'uncle', 'aunt', 'brother', 'sister']
  const rank = (m: Member) => (m.id === viewer ? ORDER.length : ORDER.indexOf(viewerRelation(m) ?? ''))
  // The viewer's own descendants are not part of the viewer's family-pattern table; the viewer's own words order the rows.
  const rows = doc.members.filter((m) => viewerGen === undefined || m.generation <= viewerGen)
  const ordered = childOfSelf ? [...rows].sort((a, b) => rank(a) - rank(b)) : rows
  const matrix: LineageMatrixRow[] = ordered.map((m) => {
    const key = viewerRelation(m)
    const word = m.id === viewer ? i18n.t('overlay:you') : key ? tDyn(`overlay:lineage.toViewer.${key}`) : m.id === self.id ? i18n.t('overlay:lineage.selfRow') : relationOf(m.relation)
    return {
      person: `${firstName(nameOfMember(m))} (${word})`,
      onset: Object.fromEntries(conds(m).map(([k, v]) => [k, typeof v === 'string' && v !== NO_AGE_MARK ? NOTE_ONLY_MARK : v])),
    }
  })
  const counts = new Map<ConditionKey, number>()
  for (const m of doc.members) for (const [k] of conds(m)) counts.set(k, (counts.get(k) ?? 0) + 1)
  // The pattern strength weighs closeness and age at onset, which a document of names and ages cannot carry: the designed rows stay,
  // and only a condition the design has no row for is added, counted by relatives.
  const designedStrength = new Set(l.strength.map((r) => r.condition))
  const extra: StrengthRow[] = [...counts.entries()]
    .filter(([k]) => !designedStrength.has(l.conditionKeys[k].name))
    .sort((a, b) => b[1] - a[1]).map(([k, n]) => ({
      condition: l.conditionKeys[k].name,
      dots: Math.min(4, n) as StrengthRow['dots'],
      label: i18n.t(n >= 3 ? 'overlay:lineage.strength.strong' : n === 2 ? 'overlay:lineage.strength.moderate' : 'overlay:lineage.strength.weak'),
    }))
  // The screening plan is the viewer's own, with intervals ("12 months") the document does not carry: the designed rows stay.
  // A document's flags only fill in a plan the mock does not have.
  const screening: ScreeningRow[] = l.screening.length ? l.screening : doc.flags.map((f) => {
    const who = doc.members.find((m) => m.id === f.memberId)
    return { check: who ? `${f.screening} · ${firstName(nameOfMember(who))}` : f.screening, interval: f.reason, due: i18n.t('overlay:lineage.dueNow'), tone: 'warn', action: i18n.t('overlay:lineage.book') }
  })
  const keys = l.matrixColumns.filter((k) => counts.has(k))
  return {
    ...l,
    generations,
    matrix,
    matrixColumns: keys.length ? keys : l.matrixColumns,
    strength: [...l.strength, ...extra],
    screening,
  }
}
