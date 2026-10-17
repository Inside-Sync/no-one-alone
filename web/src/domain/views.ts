/** Views, role-based tabs and page routing. Pure functions; no React. Text is read through i18n when accessed. */

import i18n from '@/i18n'

export type ViewId = 'individual' | 'hospital' | 'community'
export type Who = 'family' | 'self'
export type Tab = { id: string; label: string; icon?: string }

export const VIEW_IDS: readonly ViewId[] = ['individual', 'hospital', 'community']

/** Header view switcher: label (translated at read time) and icon per view. */
export const VIEW_BUTTONS: readonly { id: ViewId; readonly label: string; icon: 'heart' | 'hospital' | 'people' }[] = (
  [['individual', 'heart'], ['hospital', 'hospital'], ['community', 'people']] as const
).map(([id, icon]) => ({ id, icon, get label() { return i18n.t(`common:views.buttons.${id}`) } }))

/** `vbanner` text per view (VIEWS[v].label in the prototype); translated at read time. */
export const VIEW_LABELS: Readonly<Record<ViewId, string>> = {
  get individual() { return i18n.t('common:views.banners.individual') },
  get hospital() { return i18n.t('common:views.banners.hospital') },
  get community() { return i18n.t('common:views.banners.community') },
}

type ViewUser = { readonly initials: string; readonly color: string; readonly name: string; readonly toast: string }
const viewUser = (id: ViewId, initials: string, color: string): ViewUser => ({
  initials,
  color,
  get name() { return i18n.t(`common:views.users.${id}.name`) },
  get toast() { return i18n.t(`common:views.users.${id}.toast`) },
})

/** Who is signed in per view (VIEWS[v].me); name and toast translated at read time. */
export const VIEW_USERS: Readonly<Record<ViewId, ViewUser>> = {
  individual: viewUser('individual', 'JC', '#2f6fb0'),
  hospital: viewUser('hospital', 'AT', '#2563a8'),
  community: viewUser('community', 'PS', '#6d4fc0'),
}

type TabGroup = 'family' | 'self' | 'hospital' | 'community'
/** A tab whose label is looked up in `common:tabs.<group>.<id>` each time it is read. */
const tab = (group: TabGroup, id: string, icon?: string): Tab => ({
  id,
  ...(icon ? { icon } : {}),
  get label() { return i18n.t(`common:tabs.${group}.${id}` as 'common:tabs.family.home') },
})

export const TABS_FAM: Tab[] = ['home', 'health', 'around', 'forecast', 'lineage', 'record', 'live', 'recovery', 'device'].map((id) => tab('family', id))

export const TABS_SELF: Tab[] = ['me', 'recovery', 'health', 'privacy', 'around', 'lineage', 'device'].map((id) => tab('self', id))

const TABS_HOSPITAL: Tab[] = [
  tab('hospital', 'ed', 'siren'),
  tab('hospital', 'panel', 'people'),
  tab('hospital', 'demand', 'trend'),
  tab('hospital', 'discharge', 'check'),
]

const TABS_COMMUNITY: Tab[] = [
  tab('community', 'community', 'grid'),
  tab('community', 'watch', 'eye'),
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

const PAGE_IDS = [
  'home', 'health', 'around', 'forecast', 'lineage', 'record', 'live', 'device', 'me', 'privacy', 'recovery',
  'ed', 'panel', 'demand', 'discharge', 'community', 'watch',
] as const

/** Page titles (PG in the prototype, after the later overrides); translated at read time. */
export const PAGE_TITLES: Readonly<Record<string, string>> = Object.defineProperties(
  {},
  Object.fromEntries(PAGE_IDS.map((id) => [id, { enumerable: true, get: () => i18n.t(`common:pageTitles.${id}`) }])),
)

type OwnFact = { readonly live: boolean; readonly label: string; readonly value: string }
const ownContext = (page: 'me' | 'privacy', initials: string, live: readonly boolean[]) => ({
  initials,
  color: '#0b7f71',
  get sub() { return i18n.t(`common:ownContext.${page}.sub`) },
  get facts(): readonly OwnFact[] {
    const rows = i18n.t(`common:ownContext.${page}.facts`, { returnObjects: true }) as readonly (readonly string[])[]
    return rows.map(([label, value], i) => ({ live: live[i] ?? false, label, value }))
  },
})

/** Margaret's own pages have their own context bar (PG.me, PG.privacy); text translated at read time. */
export const OWN_CONTEXT = {
  me: ownContext('me', 'MC', [true, false, false]),
  privacy: ownContext('privacy', '🔐', [true, false]),
} as const
