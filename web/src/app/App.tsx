import { Navigate, Route, Routes, useParams } from 'react-router'
import { AppShell } from '@/components/shell/AppShell'
import { Scene } from '@/components/shell/Scene'
import { DrawerProvider } from '@/components/ui/Drawer'
import { ToastProvider } from '@/components/ui/Toast'
import { allRoutes } from '@/domain/views'
import { RoutedPage } from '@/features/RoutedPage'
import { AppStateProvider } from '@/state/AppState'
import { NotFound } from './NotFound'

const KNOWN = new Set(allRoutes().map((r) => `${r.view}/${r.page}`))

/** Only the view x page pairs in `allRoutes()` exist; anything else is a 404. */
function ViewPage() {
  const { view = '', page = '' } = useParams()
  return KNOWN.has(`${view}/${page}`) ? <RoutedPage view={view} page={page} /> : <NotFound />
}

export function App() {
  return (
    <>
      <Scene />
      <div className="flash" id="flash"></div>
      <AppStateProvider>
        <ToastProvider>
          <DrawerProvider>
            <div className="wrap">
              <AppShell>
                <Routes>
                  <Route path="/" element={<Navigate to="/individual/home" replace />} />
                  <Route path="/:view/:page" element={<ViewPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppShell>
            </div>
          </DrawerProvider>
        </ToastProvider>
      </AppStateProvider>
    </>
  )
}
