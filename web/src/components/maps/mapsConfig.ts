/** Marrickville, the centre of both map cards. */
export const MAP_CENTER = { lat: -33.911, lng: 151.155 }

/** Rotate step and default camera for the Google map (vector Map ID needed for tilt and heading). */
export const HEADING_STEP = 45
export const DEFAULT_HEADING = 0
export const DEFAULT_TILT = 45

/** Marker colours from the prototype legend; alerts follow the watch-map severities. */
export const MARKER_COLOURS = {
  home: { bg: '#14a08c', border: '#0b7f71', glyph: '#ffffff' },
  family: { bg: '#2f6fb0', border: '#245a92', glyph: '#ffffff' },
  health: { bg: '#ffffff', border: '#cccccc', glyph: '#0b7f71' },
  community: { bg: '#8f6fd0', border: '#7656b8', glyph: '#ffffff' },
  act: { bg: '#d9443f', border: '#b5302c', glyph: '#ffffff' },
  watch: { bg: '#c88a05', border: '#a07004', glyph: '#ffffff' },
  info: { bg: '#1fb39c', border: '#168c7a', glyph: '#ffffff' },
} as const

export const mapsApiKey = (): string => String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()
export const mapsMapId = (): string => String(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? '').trim()

/** True only when a Maps API key is configured; otherwise the canvas fallback renders and no script loads. */
export const mapsEnabled = (): boolean => mapsApiKey() !== ''
