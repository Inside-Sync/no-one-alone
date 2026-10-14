import { render, screen } from '@testing-library/react'
import { LocationMap, type MapMarker } from '@/components/maps/LocationMap'
import { markerColours } from '@/components/maps/LocationMap'

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="provider">{children}</div>,
  Map: ({ children, heading }: { children: React.ReactNode; heading: number }) => <div data-testid="map" data-heading={heading}>{children}</div>,
  AdvancedMarker: ({ children, title }: { children: React.ReactNode; title: string }) => <div data-testid="marker" title={title}>{children}</div>,
  Pin: ({ background }: { background: string }) => <i data-bg={background} />,
}))

const markers: MapMarker[] = [
  { id: 'a', lat: -33.911, lng: 151.155, kind: 'home', label: 'Home' },
  { id: 'b', lat: -33.912, lng: 151.156, kind: 'alert', tone: 'act', label: 'Scam' },
]
const fallback = <div>canvas fallback</div>

afterEach(() => vi.unstubAllEnvs())

test('no key: renders fallback and never loads maps script', () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '')
  render(<LocationMap markers={markers} fallback={fallback} ariaLabel="map" />)
  expect(screen.getByText('canvas fallback')).toBeInTheDocument()
  expect(document.querySelector('script[src*="maps.googleapis.com"]')).toBeNull()
})

test('with key: renders one marker per item with legend colour', () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key')
  const { container } = render(<LocationMap markers={markers} fallback={fallback} ariaLabel="map" />)
  expect(screen.queryByText('canvas fallback')).toBeNull()
  expect(screen.getAllByTestId('marker')).toHaveLength(2)
  expect(Array.from(container.querySelectorAll('i')).map((i) => i.dataset.bg)).toEqual(['#14a08c', '#d9443f'])
  expect(markerColours({ kind: 'family' }).bg).toBe('#2f6fb0')
})

test('heading prop is passed to the map (rotate buttons drive it in 45 degree steps)', () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key')
  render(<LocationMap markers={markers} fallback={fallback} ariaLabel="map" heading={45} />)
  expect(screen.getByTestId('map')).toHaveAttribute('data-heading', '45')
})
