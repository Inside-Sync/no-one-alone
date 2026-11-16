import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import i18n from '@/i18n'

const ROOT = join(import.meta.dirname, '../../src/locales')

const jsonFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? jsonFiles(join(dir, e.name)) : e.name.endsWith('.json') ? [join(dir, e.name)] : []))

const load = (lng: string) => Object.fromEntries(jsonFiles(join(ROOT, lng)).map((f) => [relative(join(ROOT, lng), f).split(sep).join('/'), JSON.parse(readFileSync(f, 'utf8')) as unknown]))

const placeholders = (s: string) => (s.match(/\{\{[^}]+\}\}/g) ?? []).sort().join(' ')

/** Every structural difference between two JSON trees: keys, array lengths, value types, non-string values and placeholders. */
function diff(en: unknown, ar: unknown, path: string, out: string[]) {
  if (typeof en === 'string' && typeof ar === 'string') {
    if (placeholders(en) !== placeholders(ar)) out.push(`${path}: placeholders ${placeholders(en)} vs ${placeholders(ar)}`)
    if (en.trim() !== '' && ar.trim() === '') out.push(`${path}: empty translation`)
    return
  }
  if (Array.isArray(en) || Array.isArray(ar)) {
    if (!Array.isArray(en) || !Array.isArray(ar)) { out.push(`${path}: array vs ${typeof ar}`); return }
    if (en.length !== ar.length) out.push(`${path}: ${en.length} items vs ${ar.length}`)
    en.forEach((v, i) => { if (i < ar.length) diff(v, ar[i], `${path}[${i}]`, out) })
    return
  }
  if (en && typeof en === 'object') {
    if (!ar || typeof ar !== 'object') { out.push(`${path}: object vs ${typeof ar}`); return }
    const a = Object.keys(en), b = Object.keys(ar)
    for (const k of a) if (!b.includes(k)) out.push(`${path}.${k}: missing in ar`)
    for (const k of b) if (!a.includes(k)) out.push(`${path}.${k}: only in ar`)
    for (const k of a) if (b.includes(k)) diff((en as Record<string, unknown>)[k], (ar as Record<string, unknown>)[k], `${path}.${k}`, out)
    return
  }
  if (en !== ar) out.push(`${path}: ${JSON.stringify(en)} vs ${JSON.stringify(ar)}`)
}

const EN = load('en')
const AR = load('ar')

test('en and ar have the same files', () => {
  expect(Object.keys(AR).sort()).toEqual(Object.keys(EN).sort())
  expect(Object.keys(EN).length).toBeGreaterThan(20)
})

test.each(Object.keys(EN))('%s: ar has the same keys, array lengths, non-text values and placeholders as en', (file) => {
  const out: string[] = []
  diff(EN[file], AR[file], file, out)
  expect(out).toEqual([])
})

test('no other language folders remain', () => {
  expect(readdirSync(ROOT, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()).toEqual(['ar', 'en'])
})

test('Arabic sets lang=ar and dir=rtl on the document, English restores ltr', async () => {
  await i18n.changeLanguage('ar')
  expect(document.documentElement.getAttribute('lang')).toBe('ar')
  expect(document.documentElement.getAttribute('dir')).toBe('rtl')
  await i18n.changeLanguage('en')
  expect(document.documentElement.getAttribute('lang')).toBe('en')
  expect(document.documentElement.getAttribute('dir')).toBe('ltr')
})

/** Every `explain` id a tile carries must name an entry of `common:explain` in both languages (the lookup is by id, not by label). */
test('tile explain ids exist in common.explain in both languages', () => {
  const ids = new Set<string>()
  const scan = (o: unknown) => {
    if (Array.isArray(o)) o.forEach(scan)
    else if (o && typeof o === 'object') {
      const r = o as Record<string, unknown>
      if (typeof r.explain === 'string') ids.add(r.explain)
      Object.values(r).forEach(scan)
    }
  }
  for (const [f, d] of Object.entries(EN)) if (f.startsWith('data/')) scan(d)
  expect(ids.size).toBeGreaterThan(10)
  for (const files of [EN, AR]) for (const id of ids) expect(Object.keys((files['common.json'] as { explain: object }).explain)).toContain(id)
})

/**
 * overlay.ts finds rows by `key`/`condition`, not by display text. These rows must carry them, in the same place in
 * both languages, so a Firestore overlay lands on the right row whatever the language.
 */
test('rows an overlay replaces carry the same id in en and ar', () => {
  for (const files of [EN, AR]) {
    const m = (files['data/margaret.json'] as { margaret: { profile: { rows: { key?: string }[] }; kpisTechnical: { key?: string }[] } }).margaret
    expect(m.profile.rows.map((r) => r.key).filter(Boolean).sort()).toEqual(['age', 'gender'])
    expect(m.kpisTechnical.map((k) => k.key).filter(Boolean)).toEqual(['restingHr'])
  }
  const idx = (files: typeof EN) => (files['data/margaret.json'] as { margaret: { profile: { rows: { key?: string }[] } } }).margaret.profile.rows.map((r) => r.key)
  expect(idx(AR)).toEqual(idx(EN))
})

/** One spelling per hospital, person and place across the Arabic files. */
test('Arabic place and hospital names have a single spelling', () => {
  const all = Object.values(AR).map((d) => JSON.stringify(d)).join('\n')
  const variants: [string, string][] = [['أبوظبي', 'أبو ظبي'], ['أبوظبي', 'أبو ظبى']]
  for (const [a, b] of variants) expect(all.includes(b) && all.includes(a)).toBe(false)
  expect(all).toContain('أبوظبي')
  expect(all).toContain('الكورنيش')
})
