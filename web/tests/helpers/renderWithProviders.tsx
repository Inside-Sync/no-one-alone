import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { DrawerProvider } from '@/components/ui/Drawer'
import { ToastProvider } from '@/components/ui/Toast'
import { AppStateProvider, useAppState, type AppStateValue } from '@/state/AppState'

/** Captures the live app state so a test can call `toggleShare`, `setViewer`, ... */
function Probe({ onState }: { onState: (s: AppStateValue) => void }) {
  onState(useAppState())
  return null
}

interface Options {
  /** Seeds sessionStorage, which AppStateProvider reads on mount. */
  who?: 'self' | 'family'
  viewer?: string
}

/** Renders `ui` inside the same providers the real layout uses (Toast, Drawer, AppState). */
export function renderWithProviders(ui: ReactElement, opts: Options = {}): RenderResult & { app: () => AppStateValue } {
  sessionStorage.clear()
  if (opts.who || opts.viewer) sessionStorage.setItem('noa-app-state', JSON.stringify({ who: opts.who, viewer: opts.viewer }))
  let state!: AppStateValue
  const result = render(
    <ToastProvider>
      <DrawerProvider>
        <AppStateProvider>
          <Probe onState={(s) => { state = s }} />
          {ui}
        </AppStateProvider>
      </DrawerProvider>
    </ToastProvider>,
  )
  return Object.assign(result, { app: () => state })
}
