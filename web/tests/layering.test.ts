import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : []
  })
}

test('components and features read data through the repo, never fixtures', () => {
  const offenders = ['src/components', 'src/features', 'src/state']
    .flatMap(files)
    .filter((f) => /data\/fixtures/.test(readFileSync(f, 'utf8')))
  expect(offenders).toEqual([])
})

/** Source without comments (line numbers kept), so a doc comment that names a forbidden call (e.g. "never Date.now()") is not a use. */
const code = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

/** A line may opt out with a trailing `// layering-allow: <reason>` comment (legitimate non-display use only). */
const ALLOW = /layering-allow:/
const hits = (dirs: string[], re: RegExp) =>
  dirs.flatMap(files).flatMap((f) => {
    const raw = readFileSync(f, 'utf8').split('\n')
    return code(f).split('\n').flatMap((line, i) => (re.test(line) && !ALLOW.test(raw[i] ?? '') ? [`${f}:${i + 1}`] : []))
  })

test('nothing in src imports next/* (the app runs on Vite + React Router)', () => {
  expect(hits(['src'], /from\s+['"]next\/|import\(\s*['"]next\//)).toEqual([])
})

test('only src/lib/firebase.ts and src/data/sources/firebase.ts import firebase/*', () => {
  const allowed = new Set([join('src', 'lib', 'firebase.ts'), join('src', 'data', 'sources', 'firebase.ts')])
  const offenders = hits(['src'], /from\s+['"]firebase\/|import\(\s*['"]firebase\//).filter((h) => !allowed.has(h.slice(0, h.lastIndexOf(':'))))
  expect(offenders).toEqual([])
})

test('UI, state and domain never read the wall clock or randomness (the prototype "now" is fixed)', () => {
  expect(hits(['src/components', 'src/features', 'src/state', 'src/domain'], /\bDate\.now\(|\bMath\.random\(/)).toEqual([])
})

test('the layering checks see real code (guards against a vacuous pass)', () => {
  // The comment in AppState names Date.now() but is stripped; a planted line would be caught.
  expect(/\bDate\.now\(/.test(code('src/state/AppState.tsx'))).toBe(false)
  expect(/\bDate\.now\(/.test('const t = Date.now()')).toBe(true)
  expect(files('src/components').length).toBeGreaterThan(10)
})
