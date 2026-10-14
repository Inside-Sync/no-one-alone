import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { AppStateProvider, useAppState } from '@/state/AppState'
import { Locked } from '@/components/ui/Locked'

vi.mock('next/navigation', () => ({ usePathname: () => '/individual/home/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

function Ctl() {
  const a = useAppState()
  return (
    <div>
      <button onClick={() => a.setViewer('sarah')}>viewer-sarah</button>
      <button onClick={() => a.setWho('self')}>who-self</button>
      <button onClick={() => a.togglePause()}>pause</button>
      <button onClick={() => a.toggleShare('sarah', 'meds')}>share-meds</button>
      <button onClick={() => a.toggleShare('james', 'safety')}>share-safety</button>
      <output data-testid="audit">{JSON.stringify(a.audit)}</output>
    </div>
  )
}
const ui = (cat: 'meds' | 'heart' = 'meds') => (
  <AppStateProvider>
    <Ctl />
    <Locked cat={cat}><span>Apixaban 5 mg</span></Locked>
  </AppStateProvider>
)
beforeEach(() => sessionStorage.clear())
const click = async (name: string) => { await act(async () => { fireEvent.click(screen.getByRole('button', { name })) }) }

test('locked content is not in the DOM', async () => {
  render(ui())
  await click('viewer-sarah')
  expect(await screen.findByText('Margaret keeps her tablets private')).toBeInTheDocument()
  expect(screen.queryByText(/Apixaban/)).toBeNull()
  expect(document.body.innerHTML).not.toMatch(/Apixaban/)
})

test('nothing flashes while share is loading', () => {
  render(ui())
  expect(screen.queryByText(/Apixaban/)).toBeNull()
})

test('allowed viewer sees children', async () => {
  render(ui('heart'))
  expect(await screen.findByText('Apixaban 5 mg')).toBeInTheDocument()
})

test('self view never locks', async () => {
  render(ui())
  await click('viewer-sarah')
  await click('who-self')
  expect(await screen.findByText('Apixaban 5 mg')).toBeInTheDocument()
})

test('paused locks with the paused message and writes audit', async () => {
  render(ui('heart'))
  await screen.findByText('Apixaban 5 mg')
  await click('pause')
  expect(screen.getByText('Margaret paused sharing until tomorrow')).toBeInTheDocument()
  expect(screen.queryByText(/Apixaban/)).toBeNull()
  expect(screen.getByTestId('audit').textContent).toContain('"action":"pause"')
  await click('pause')
  expect(await screen.findByText('Apixaban 5 mg')).toBeInTheDocument()
  expect(screen.getByTestId('audit').textContent).toContain('"action":"resume"')
})

test('toggleShare flips access optimistically and audits; safety is a no-op', async () => {
  render(ui())
  await click('viewer-sarah')
  await screen.findByText('Margaret keeps her tablets private')
  await click('share-meds')
  expect(await screen.findByText('Apixaban 5 mg')).toBeInTheDocument()
  const a = JSON.parse(screen.getByTestId('audit').textContent!)
  expect(a).toHaveLength(1)
  expect(a[0]).toMatchObject({ at: '15:10', who: 'Margaret', action: 'share-on', viewer: 'sarah', category: 'meds', on: true })
  await click('share-safety')
  await waitFor(() => expect(JSON.parse(screen.getByTestId('audit').textContent!)).toHaveLength(1))
})
