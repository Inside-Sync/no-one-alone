import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { DrawerProvider } from '@/components/ui/Drawer'
import { Locked } from '@/components/ui/Locked'
import { ToastProvider } from '@/components/ui/Toast'
import { avatarSrc } from '@/data/avatars'
import { mockSource, resetMockSource } from '@/data/sources/mock'
import { isSpeechCheck } from '@/domain/agent'
import { explainFor } from '@/features/shared/drawers'
import i18n from '@/i18n'
import { AppStateProvider, useAppState } from '@/state/AppState'

vi.mock('@/app/navigation', () => ({ usePathname: () => '/individual/home/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

beforeEach(async () => { sessionStorage.clear(); sessionStorage.setItem('noa-app-state', JSON.stringify({ who: 'family' })); resetMockSource(); await act(() => i18n.changeLanguage('ar')) })
afterEach(async () => { await act(() => i18n.changeLanguage('en')) })

function Pause() {
  const a = useAppState()
  return <button onClick={() => a.togglePause()}>pause</button>
}

test('the Kept private sheet says "you" for the signed-in viewer by id, not by the English name', async () => {
  render(
    <ToastProvider><DrawerProvider><AppStateProvider>
      <Pause />
      <Locked cat="heart"><span>x</span></Locked>
    </AppStateProvider></DrawerProvider></ToastProvider>,
  )
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'pause' })) })
  fireEvent.click(await screen.findByText(i18n.t('lock.paused')))
  const sheet = screen.getByRole('dialog', { hidden: true })
  expect(sheet).toHaveTextContent(i18n.t('keptPrivate.bodyPaused', { viewerName: i18n.t('you') }))
  expect(sheet).not.toHaveTextContent('جيمس')
})

test('a tile drawer explains itself in Arabic, by the tile id rather than by its label', async () => {
  const p = await mockSource.getPerson('margaret')
  const hr = p.kpis.find((k) => k.explain === 'heart rate')!
  expect(hr).toBeDefined()
  expect(explainFor(hr.explain, 'individual')).toBe(i18n.t('common:explain.heart rate'))
  expect(explainFor(hr.explain, 'individual')).toMatch(/[؀-ۿ]/)
  expect(explainFor(undefined, 'government')).toBe(i18n.t('common:explainFallback.government'))
  expect(explainFor('no such tile', 'hospital')).toBe(i18n.t('common:explainFallback.hospital'))
})

test('every plain-language KPI tile has an explanation of its own', async () => {
  const p = await mockSource.getPerson('margaret')
  for (const k of p.kpis) {
    expect(k.explain, k.label).toBeTruthy()
    expect(explainFor(k.explain, 'individual')).not.toBe(i18n.t('common:explainFallback.individual'))
  }
})

test('Arabic names show the same photos as English ones', () => {
  expect(avatarSrc('ديفيد هيوز')).toBe('/avatars/david.jpg')
  expect(avatarSrc('مارغريت كولينز')).toBe('/avatars/margaret.jpg')
  expect(avatarSrc('جيمس · الابن')).toBe('/avatars/james.jpg')
  expect(avatarSrc('د. فاطمة العلي')).toBe('/avatars/dr-patel.jpg')
  expect(avatarSrc('أحمد')).toBeUndefined()
})

test('the speech check question is recognised in either language', () => {
  expect(isSpeechCheck('Please say after me: The sky is blue in Sydney.')).toBe(true)
  expect(isSpeechCheck('من فضلك ردّدي خلفي: «السماء زرقاء في سيدني».')).toBe(true)
  expect(isSpeechCheck('Are you in pain?')).toBe(false)
})

test('helper log "passive" rows are marked in the data, so the pill tone does not depend on the wording', async () => {
  const p = await mockSource.getPerson('margaret')
  const passive = p.helperLogTechnical.filter((e) => e.passive)
  expect(passive).toHaveLength(1)
  await act(() => i18n.changeLanguage('en'))
  const en = await mockSource.getPerson('margaret')
  expect(en.helperLogTechnical.filter((e) => e.passive).map((e) => e.time)).toEqual(passive.map((e) => e.time))
})

test('Arabic news ages are spelled out in Arabic, with no Latin unit left', async () => {
  const { news } = await mockSource.getSurroundings('margaret')
  for (const n of news) expect(n.age).not.toMatch(/[A-Za-z]/)
})
