import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { resetMockSource } from '@/data/sources/mock'
import { DrawerProvider } from '@/components/ui/Drawer'
import { ToastProvider } from '@/components/ui/Toast'
import { AppStateProvider, useAppState } from '@/state/AppState'
import { Locked } from '@/components/ui/Locked'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/home/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

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
  <ToastProvider>
    <DrawerProvider>
      <AppStateProvider>
        <Ctl />
        <Locked cat={cat}><span>Apixaban 5 mg</span></Locked>
      </AppStateProvider>
    </DrawerProvider>
  </ToastProvider>
)
beforeEach(() => { sessionStorage.clear(); resetMockSource() })
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

test('tapping a locked card opens the Kept private sheet', async () => {
  render(ui())
  await click('viewer-sarah')
  fireEvent.click(await screen.findByText('Margaret keeps her tablets private'))
  const drawer = screen.getByRole('dialog', { hidden: true })
  expect(drawer).toHaveClass('on')
  expect(drawer).toHaveTextContent('Kept private')
  expect(drawer).toHaveTextContent("Margaret has chosen not to share this with Sarah. That's her choice, and she can change it any time.")
  fireEvent.click(screen.getByRole('button', { name: 'Ask Margaret kindly' }))
  expect(document.getElementById('toast')!.textContent).toBe('Margaret will get a gentle request she can say yes or no to')
  expect(screen.getByRole('button', { name: '✓ Request sent', hidden: true })).toBeDisabled()
})

test('the sheet says "you" for James and mentions the pause', async () => {
  render(ui('heart'))
  await click('pause')
  fireEvent.click(await screen.findByText('Margaret paused sharing until tomorrow'))
  expect(screen.getByRole('dialog', { hidden: true })).toHaveTextContent(
    'Margaret has chosen not to share this with you right now. She paused sharing until 9 am tomorrow. Safety alerts still reach you.',
  )
})
