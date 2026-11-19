/** Views, role-based tabs and page routing. Pure functions; no React. Text is read through i18n when accessed. */

import i18n from '@/i18n'
import type { IconName } from '@/data/types'
import { legacyPagesOn } from '@/config/legacy'

export type ViewId = 'individual' | 'hospital' | 'government'
export type Who = 'family' | 'self'
/** `emoji`: the tab shows its colour emoji (the Individual tabs); otherwise a line icon. */
export type Tab = { id: string; label: string; icon?: IconName; emoji?: boolean }

export const VIEW_IDS: readonly ViewId[] = ['individual', 'hospital', 'government']

/** Header view switcher: label (translated at read time) and icon per view. */
export const VIEW_BUTTONS: readonly { id: ViewId; readonly label: string; icon: 'heart' | 'hospital' | 'people' }[] = (
  [['individual', 'heart'], ['hospital', 'hospital'], ['government', 'people']] as const
).map(([id, icon]) => ({ id, icon, get label() { return i18n.t(`common:views.buttons.${id}`) } }))

/** `vbanner` text per view (VIEWS[v].label in the prototype); translated at read time. */
export const VIEW_LABELS: Readonly<Record<ViewId, string>> = {
  get individual() { return i18n.t('common:views.banners.individual') },
  get hospital() { return i18n.t('common:views.banners.hospital') },
  get government() { return i18n.t('common:views.banners.government') },
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
  individual: viewUser('individual', 'K', '#e07a3f'),
  hospital: viewUser('hospital', 'OH', '#2563a8'),
  government: viewUser('government', 'DH', '#6d4fc0'),
}

type TabGroup = 'family' | 'self' | 'hospital' | 'government'
/** A tab whose label is looked up in `common:tabs.<group>.<id>` each time it is read. */
const tab = (group: TabGroup, id: string, icon?: IconName): Tab => ({
  id,
  ...(icon ? { icon } : {}),
  ...(group === 'family' || group === 'self' ? { emoji: true } : {}),
  get label() { return i18n.t(`common:tabs.${group}.${id}` as 'common:tabs.family.health') },
})

/**
 * Family and carers: Moza's health and care record within what she shares. Treatment has no tab of its own: it is
 * step 5 of the care record and opens from its buttons (see `ROUTED_ONLY`).
 */
export const TABS_FAM: Tab[] = ([
  ['health', 'heart'], ['record', 'clipboard-list'],
] as const).map(([id, icon]) => tab('family', id, icon))

/**
 * Moza's own app. Family health comes first and is where Individual opens (`firstPage`). My treatment is reached from
 * the care record; Around me and My phone are hidden and their links open My day (`INDIVIDUAL_REDIRECTS`).
 */
export const TABS_SELF: Tab[] = ([
  ['lineage', 'tree'], ['me', 'sun'], ['health', 'heart'], ['record', 'clipboard-list'],
] as const).map(([id, icon]) => tab('self', id, icon))

const TABS_HOSPITAL: Tab[] = [
  tab('hospital', 'overview', 'grid'),
  tab('hospital', 'patients', 'file'),
  tab('hospital', 'referrals', 'clinic'),
  tab('hospital', 'ed', 'siren'),
]

const TABS_GOVERNMENT: Tab[] = [
  tab('government', 'population', 'grid'),
  tab('government', 'signals', 'eye'),
]

/** The night alert replay: a tab only while its page is open (family and carers), reached from the demo switch or Moza's phone. */
const TAB_LIVE: Tab = tab('family', 'live', 'siren')

/**
 * Routed pages that have no tab of their own: `review` opens from "Open results to review"; `live` from the demo;
 * `treatment` from the care record (its step 5).
 */
const ROUTED_ONLY: Readonly<Record<ViewId, readonly string[]>> = {
  individual: ['live', 'treatment'],
  hospital: ['review'],
  government: [],
}

/** Routes that existed before and where they live now (the role-independent ones; see `ROLE_REDIRECT_PAGES` for the rest). */
export const LEGACY_ROUTES: Readonly<Record<string, string>> = {
  '/community': '/government/population',
  '/community/community': '/government/population',
  '/community/population': '/government/population',
  '/community/watch': '/government/signals',
  '/community/signals': '/government/signals',
  '/hospital/panel': '/hospital/patients',
  '/hospital/patient': '/hospital/patients',
  '/hospital/demand': '/hospital/overview',
  '/hospital/discharge': '/hospital/overview',
  '/hospital/loop': '/hospital/overview',
}

/** Individual pages that were removed: they open the first tab of the current role (`firstPage('individual', who)`). */
export const ROLE_REDIRECT_PAGES: readonly string[] = ['home', 'forecast', 'recovery', 'privacy']

/**
 * Individual pages hidden by the redesign (Around me, My phone): Moza's pages without a tab; their links open My day, as
 * in the prototype, unless the legacy pages are switched on (config/legacy).
 */
export const HIDDEN_PAGES: readonly string[] = ['around', 'device']
export const INDIVIDUAL_REDIRECTS: Readonly<Record<string, string>> = {
  '/individual/around': '/individual/me',
  '/individual/device': '/individual/me',
}

/** The tab to mark as current for a page: Treatment is a step of the care record, so the care record tab is lit. */
export function currentTab(view: ViewId, page: string | undefined): string | undefined {
  return view === 'individual' && page === 'treatment' ? 'record' : page
}

export function isViewId(v: string): v is ViewId {
  return (VIEW_IDS as readonly string[]).includes(v)
}

/** The tabs of a view; with `page` set, the night alert tab is added while that page is open. */
export function tabsFor(view: ViewId, who: Who, page?: string): Tab[] {
  if (view === 'hospital') return TABS_HOSPITAL
  if (view === 'government') return TABS_GOVERNMENT
  const base = who === 'self' ? TABS_SELF : TABS_FAM
  return page === 'live' ? [...base, TAB_LIVE] : base
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
  if (tabsFor(view, who).some((t) => t.id === page) || ROUTED_ONLY[view].includes(page)) return { kind: 'ok' }
  if (view === 'individual' && HIDDEN_PAGES.includes(page)) return legacyPagesOn() ? { kind: 'ok' } : { kind: 'redirect', to: '/individual/me' }
  const other: Who = who === 'self' ? 'family' : 'self'
  if (view === 'individual' && tabsFor(view, other).some((t) => t.id === page)) {
    return { kind: 'redirect', to: `/individual/${firstPage(view, who)}` }
  }
  return { kind: 'notFound' }
}

/** The role an individual page belongs to when only one role has it as a tab (`me` -> self); undefined when shared or not individual. */
export function whoForPage(view: string, page: string | undefined): Who | undefined {
  if (view !== 'individual' || !page) return undefined
  const self = TABS_SELF.some((t) => t.id === page) || HIDDEN_PAGES.includes(page)
  const fam = TABS_FAM.some((t) => t.id === page)
  return self === fam ? undefined : self ? 'self' : 'family'
}

/** Every valid view x page pair: the routes App.tsx accepts (anything else is a 404). Tabs of both roles, the routed-only pages, then the hidden ones. */
export function allRoutes(): { view: ViewId; page: string }[] {
  const out: { view: ViewId; page: string }[] = []
  for (const view of VIEW_IDS) {
    const ids = new Set<string>()
    for (const who of ['family', 'self'] as const) for (const t of tabsFor(view, who)) ids.add(t.id)
    for (const id of ROUTED_ONLY[view]) ids.add(id)
    if (view === 'individual') for (const id of HIDDEN_PAGES) ids.add(id)
    for (const page of ids) out.push({ view, page })
  }
  return out
}

/** `/hospital/ed/` -> { view: 'hospital', page: 'ed' }. Unknown paths fall back to individual. */
export function parsePath(pathname: string | null): { view: ViewId; page: string | undefined } {
  const [v, p] = (pathname ?? '').split('/').filter(Boolean)
  return { view: v && isViewId(v) ? v : 'individual', page: p }
}

export const PAGE_IDS = [
  'me', 'health', 'record', 'treatment', 'around', 'lineage', 'device', 'live',
  'overview', 'patients', 'referrals', 'ed', 'review', 'population', 'signals',
] as const

/**
 * Page titles (PG in the prototype, after the later overrides); translated at read time. This is Moza's own title;
 * the family role differs on `record` and `treatment` (`pageTitle(page, who)`).
 */
export const PAGE_TITLES: Readonly<Record<string, string>> = Object.defineProperties(
  {},
  Object.fromEntries(PAGE_IDS.map((id) => [id, { enumerable: true, get: () => i18n.t(`common:pageTitles.${id}`) }])),
)

/** The `h1` of a page for a role: family and carers read "Care record · Moza Al Hammadi" where Moza reads "My care record". */
export function pageTitle(view: string, page: string, who: Who): string {
  if (view === 'individual' && who === 'family' && (page === 'record' || page === 'treatment')) {
    return i18n.t(`common:pageTitlesFamily.${page}`)
  }
  return i18n.t(`common:pageTitles.${page as (typeof PAGE_IDS)[number]}`)
}

export type ContextFact = { readonly live: boolean; readonly label: string; readonly value: string }
export type PageContext = { readonly initials: string; readonly color: string; readonly sub: string; readonly facts: readonly ContextFact[] }

/** The context bar of a page (`common:pageContext.<group>.<page>`): avatar, subtitle and facts; the first fact carries the live dot. */
export function pageContext(view: string, who: Who, page: string | undefined): PageContext | undefined {
  if (!page || !isViewId(view)) return undefined
  const group = view === 'individual' ? who : view
  const key = `common:pageContext.${group}.${page}`
  if (!i18n.exists(key)) {
    // `live` and the shared pages exist for the other role only when it is reached from there; fall back to Moza's.
    if (view !== 'individual') return undefined
    const alt = `common:pageContext.${who === 'self' ? 'family' : 'self'}.${page}`
    if (!i18n.exists(alt)) return undefined
    return readContext(alt)
  }
  return readContext(key)
}

function readContext(key: string): PageContext {
  const c = (i18n.t as (k: string, o: object) => unknown)(key, { returnObjects: true }) as { initials: string; color: string; sub: string; facts: readonly (readonly string[])[] }
  return { initials: c.initials, color: c.color, sub: c.sub, facts: c.facts.map(([label, value], i) => ({ live: i === 0, label, value })) }
}
