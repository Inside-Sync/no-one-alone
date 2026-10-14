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
