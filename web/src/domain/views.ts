/** Views, role-based tabs and page routing. Pure functions; no React. */

export type ViewId = 'individual' | 'hospital' | 'community'
export type Who = 'family' | 'self'
export type Tab = { id: string; label: string; icon?: string }

export const VIEW_IDS: readonly ViewId[] = ['individual', 'hospital', 'community']

/** Header view switcher: label and icon per view. */
export const VIEW_BUTTONS: { id: ViewId; label: string; icon: 'heart' | 'hospital' | 'people' }[] = [
  { id: 'individual', label: 'Individual', icon: 'heart' },
  { id: 'hospital', label: 'Hospital', icon: 'hospital' },
  { id: 'community', label: 'Community', icon: 'people' },
]

/** `vbanner` text per view (VIEWS[v].label in the prototype). */
export const VIEW_LABELS: Record<ViewId, string> = {
  individual: 'Individual view · Margaret and her family',
  hospital: 'Hospital view · Camperdown Stroke Centre',
  community: 'Community view · Inner West Community Health',
}

/** Who is signed in per view (VIEWS[v].me). */
export const VIEW_USERS: Record<ViewId, { initials: string; color: string; name: string; toast: string }> = {
  individual: { initials: 'JC', color: '#2f6fb0', name: 'James Collins', toast: 'Signed in as James Collins · son · Melbourne' },
  hospital: { initials: 'AT', color: '#2563a8', name: 'Dr Amelia Tran', toast: 'Signed in as Dr Amelia Tran · ED consultant' },
  community: { initials: 'PS', color: '#6d4fc0', name: 'Priya Sharma', toast: 'Signed in as Priya Sharma · community nurse' },
}

export const TABS_FAM: Tab[] = [
  { id: 'home', label: '🏠 Home' },
  { id: 'health', label: '❤️ Health' },
  { id: 'around', label: '🌤️ Around her' },
  { id: 'forecast', label: "🔮 What's ahead" },
  { id: 'lineage', label: '🌳 Health Lineage' },
  { id: 'record', label: '📋 Care record' },
  { id: 'live', label: '🚨 Emergency' },
  { id: 'device', label: '📱 Her phone' },
]

export const TABS_SELF: Tab[] = [
  { id: 'me', label: '🌞 My day' },
  { id: 'health', label: '❤️ My health' },
  { id: 'privacy', label: '🔐 Who sees what' },
  { id: 'around', label: '🌤️ Around me' },
  { id: 'lineage', label: '🌳 My family health' },
  { id: 'device', label: '📱 My phone' },
]

const TABS_HOSPITAL: Tab[] = [
  { id: 'ed', label: 'Pre-arrivals', icon: 'siren' },
  { id: 'panel', label: 'Patient panel', icon: 'people' },
  { id: 'demand', label: 'Demand & beds', icon: 'trend' },
  { id: 'discharge', label: 'Discharge follow-up', icon: 'check' },
]

const TABS_COMMUNITY: Tab[] = [
  { id: 'community', label: 'Community overview', icon: 'grid' },
  { id: 'watch', label: 'Neighbourhood watch', icon: 'eye' },
]

export function isViewId(v: string): v is ViewId {
  return (VIEW_IDS as readonly string[]).includes(v)
}

export function tabsFor(view: ViewId, who: Who): Tab[] {
  if (view === 'hospital') return TABS_HOSPITAL
  if (view === 'community') return TABS_COMMUNITY
  return who === 'self' ? TABS_SELF : TABS_FAM
}

export function firstPage(view: ViewId, who: Who): string {
  return tabsFor(view, who)[0].id
}

export type PageResolution =
  | { kind: 'ok' }
  | { kind: 'redirect'; to: string }
  | { kind: 'notFound' }

export function resolvePage(view: string, page: string, who: Who): PageResolution {
  if (!isViewId(view)) return { kind: 'notFound' }
  if (tabsFor(view, who).some((t) => t.id === page)) return { kind: 'ok' }
  const other: Who = who === 'self' ? 'family' : 'self'
  if (view === 'individual' && tabsFor(view, other).some((t) => t.id === page)) {
    return { kind: 'redirect', to: `/individual/${firstPage(view, who)}` }
  }
  return { kind: 'notFound' }
}

/** Every valid view x page pair: the routes App.tsx accepts (anything else is a 404). */
export function allRoutes(): { view: ViewId; page: string }[] {
  const out: { view: ViewId; page: string }[] = []
  for (const view of VIEW_IDS) {
    const ids = new Set<string>()
    for (const who of ['family', 'self'] as const) for (const t of tabsFor(view, who)) ids.add(t.id)
    for (const page of ids) out.push({ view, page })
  }
  return out
}

/** `/hospital/ed/` -> { view: 'hospital', page: 'ed' }. Unknown paths fall back to individual. */
export function parsePath(pathname: string | null): { view: ViewId; page: string | undefined } {
  const [v, p] = (pathname ?? '').split('/').filter(Boolean)
  return { view: v && isViewId(v) ? v : 'individual', page: p }
}

/** Page titles (PG in the prototype, after the later overrides). */
export const PAGE_TITLES: Record<string, string> = {
  home: 'Margaret Collins, 78',
  health: 'Health · Margaret Collins',
  around: 'Around her · Margaret Collins',
  forecast: "What's ahead · Margaret Collins",
  lineage: 'Health Lineage · Collins and Hughes families',
  record: 'Care record · Margaret Collins',
  live: 'Emergency · Margaret Collins',
  device: "Margaret's phone",
  me: 'Hello, Margaret',
  privacy: 'Who sees what',
  ed: 'Pre-arrivals · Camperdown Stroke Centre',
  panel: 'Patient panel · older patients',
  demand: 'Demand and beds · next 14 days',
  discharge: 'Discharge follow-up · last 30 days',
  community: 'Inner West community',
  watch: 'Neighbourhood watch · Inner West',
}

/** Margaret's own pages have their own context bar (PG.me, PG.privacy). */
export const OWN_CONTEXT = {
  me: {
    initials: 'MC',
    color: '#0b7f71',
    sub: 'Your own space · only you see this page',
    facts: [
      { live: true, label: "You're sharing with", value: '6 people' },
      { live: false, label: 'Cameras', value: 'none' },
      { live: false, label: 'Location', value: 'off' },
    ],
  },
  privacy: {
    initials: '🔐',
    color: '#0b7f71',
    sub: 'You decide what each person can see. Change it any time.',
    facts: [
      { live: true, label: 'Safety alerts', value: 'always to David and James' },
      { live: false, label: 'Location', value: 'off' },
    ],
  },
} as const
