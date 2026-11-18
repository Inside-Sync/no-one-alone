// Runs scripts/benchmark-report.ts. The engine is TypeScript with `@/` imports and JSON locales, which Vitest already resolves,
// so the report is written by a test that is skipped unless BENCH_REPORT is set. No extra dependency.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const vitest = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))
const r = spawnSync(process.execPath, [vitest, 'run', 'tests/benchmark/report.test.ts'], { cwd: root, stdio: 'inherit', env: { ...process.env, BENCH_REPORT: '1' } })
process.exit(r.status ?? 1)
