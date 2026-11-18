import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SCENARIOS, runAllSync } from '@/features/testcase/bench'
import { FINDINGS, buildReport, writeReport } from '../../scripts/benchmark-report'

const results = runAllSync(SCENARIOS)

test('the report states the counts, the 998 metrics with intervals, the subgroups and every difference', () => {
  const md = buildReport(results)
  expect(md).toContain('# Test report: Noa rule benchmark')
  expect(md).toContain(`**${SCENARIOS.length} scenarios**`)
  expect(md).toMatch(/Sensitivity.*95% CI/)
  expect(md).toContain('Specificity')
  expect(md).toContain('Language')
  expect(md).toContain('Time of day')
  expect(md).toContain('Age band')
  expect(md).toContain('It is not clinical validation')
  for (const f of results.filter((r) => !r.pass)) {
    expect(md).toContain(f.id)
    expect(FINDINGS[f.id], `a finding is written for ${f.id}`).toBeTruthy()
  }
  expect(md.endsWith('\n')).toBe(true)
  expect(buildReport(results)).toBe(md)
})

// `npm run benchmark:report` sets BENCH_REPORT: this is the part that writes docs/submission/test-report.md.
test.skipIf(!process.env.BENCH_REPORT)('writes docs/submission/test-report.md', () => {
  const file = writeReport()
  expect(file).toBe(resolve(process.cwd(), '..', 'docs', 'submission', 'test-report.md'))
  expect(existsSync(file)).toBe(true)
  expect(readFileSync(file, 'utf8')).toContain('# Test report')
})

test('docs/submission/test-report.md is the report of the current scenarios (run `npm run benchmark:report` when this fails)', () => {
  const file = resolve(import.meta.dirname, '..', '..', '..', 'docs', 'submission', 'test-report.md')
  expect(existsSync(file)).toBe(true)
  expect(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).toBe(buildReport(results))
})
