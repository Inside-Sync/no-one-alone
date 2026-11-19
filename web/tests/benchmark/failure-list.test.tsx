import { render, screen } from '@testing-library/react'
import { SCENARIOS, computeMetrics, runScenario } from '@/features/testcase/bench'
import { FailureList } from '@/features/testcase/ui/bench/BenchParts'

test('a scenario whose answer key disagrees is listed with its first difference', () => {
  const sc = SCENARIOS.find((s) => s.id === 'C-spo2-fine')!
  const wrong = { ...sc, expected: { ...sc.expected, rule: 'R9' } }
  render(<FailureList m={computeMetrics([runScenario(wrong)])} />)
  expect(screen.getAllByText('C-spo2-fine').length).toBeGreaterThan(0)
  expect(screen.getByText(/First difference: decision, Noa, rule/)).toBeInTheDocument()
})
