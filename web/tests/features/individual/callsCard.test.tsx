import { render } from '@testing-library/react'
import { CallsCard } from '@/features/individual/live/CallsCard'
import type { AgentView } from '@/domain/agent'
import '@/i18n'

const row = (id: string, name: string) => ({ id, name, initials: name.slice(0, 2), color: '#000', sub: '', status: '', cls: '' })

test('the 998 row is first and the family rows are numbered 1 and 2', () => {
  const agent = { calls: [row('ooo', '998'), row('khalid', 'Khalid'), row('hamad', 'Hamad')], alerts: [] } as unknown as AgentView
  render(<CallsCard agent={agent} />)
  const numbers = Array.from(document.querySelectorAll('.ccard .n')).map((n) => n.textContent)
  expect(numbers).toEqual(['', '1', '2'])
})
