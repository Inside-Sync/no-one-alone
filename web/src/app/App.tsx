import { Navigate, Route, Routes, useParams } from 'react-router'
import { AppShell } from '@/components/shell/AppShell'
import { DrawerReset } from '@/components/shell/DrawerReset'
import { Scene } from '@/components/shell/Scene'
import { DrawerProvider } from '@/components/ui/Drawer'
import { ToastProvider } from '@/components/ui/Toast'
import { allRoutes, firstPage, LEGACY_ROUTES, ROLE_REDIRECT_PAGES } from '@/domain/views'
import { RoutedPage } from '@/features/RoutedPage'
import { AppStateProvider, useAppState } from '@/state/AppState'
import { TourProvider } from '@/state/Tour'
import { LiveIncidentProvider } from '@/state/LiveIncident'
import { NotFound } from './NotFound'

const KNOWN = new Set(allRoutes().map((r) => `${r.view}/${r.page}`))

/** Only the view x page pairs in `allRoutes()` exist; anything else is a 404. */
function ViewPage() {
  const { view = '', page = '' } = useParams()
  return KNOWN.has(`${view}/${page}`) ? <RoutedPage view={view} page={page} /> : <NotFound />
}

/** Opens the first tab of the current role's individual view (the role is read from storage first, so wait for it). */
function RoleHome() {
  const { who, hydrated } = useAppState()
  if (!hydrated) return null
  return <Navigate to={`/individual/${firstPage('individual', who)}`} replace />
}

export function App() {
  return (
    <>
      <Scene />
      <div className="flash" id="flash"></div>
      <LiveIncidentProvider>
      <AppStateProvider>
        <ToastProvider>
          <DrawerProvider>
            <DrawerReset />
            <TourProvider>
            <div className="wrap">
              <AppShell>
                <Routes>
                  <Route path="/" element={<RoleHome />} />
                  <Route path="/individual" element={<RoleHome />} />
                  <Route path="/hospital" element={<Navigate to="/hospital/overview" replace />} />
                  <Route path="/government" element={<Navigate to="/government/population" replace />} />
                  {ROLE_REDIRECT_PAGES.map((p) => (
                    <Route key={p} path={`/individual/${p}`} element={<RoleHome />} />
                  ))}
                  {Object.entries(LEGACY_ROUTES).map(([from, to]) => (
                    <Route key={from} path={from} element={<Navigate to={to} replace />} />
                  ))}
                  <Route path="/community/*" element={<Navigate to="/government/population" replace />} />
                  <Route path="/:view/:page" element={<ViewPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppShell>
            </div>
            </TourProvider>
          </DrawerProvider>
        </ToastProvider>
      </AppStateProvider>
      </LiveIncidentProvider>
    </>
  )
}
