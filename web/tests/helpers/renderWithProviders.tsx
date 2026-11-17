import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { DrawerReset } from '@/components/shell/DrawerReset'
import { DrawerProvider } from '@/components/ui/Drawer'
import { ToastProvider } from '@/components/ui/Toast'
import { AppStateProvider, useAppState, type AppStateValue } from '@/state/AppState'
import { TourProvider } from '@/state/Tour'

/** Captures the live app state so a test can call `toggleShare`, `setViewer`, ... */
function Probe({ onState }: { onState: (s: AppStateValue) => void }) {
  onState(useAppState())
  return null
}

interface Options {
  /** Seeds sessionStorage, which AppStateProvider reads on mount. The app opens as `self`; these tests were written for the family view, so `family` is the default here. */
  who?: 'self' | 'family'
  viewer?: string
}

/** Renders `ui` inside the same providers, in the same order, as `src/app/App.tsx` (AppState > Toast > Drawer, plus DrawerReset and the Tour).
 * Test files mock `@/app/navigation`, which DrawerReset reads. */
export function renderWithProviders(ui: ReactElement, opts: Options = {}): RenderResult & { app: () => AppStateValue } {
  sessionStorage.clear()
  sessionStorage.setItem('noa-app-state', JSON.stringify({ who: opts.who ?? 'family', viewer: opts.viewer }))
  let state!: AppStateValue
  const result = render(
    <AppStateProvider>
      <ToastProvider>
        <DrawerProvider>
          <DrawerReset />
          <TourProvider>
            <Probe onState={(s) => { state = s }} />
            {ui}
          </TourProvider>
        </DrawerProvider>
      </ToastProvider>
    </AppStateProvider>,
  )
  return Object.assign(result, { app: () => state })
}
