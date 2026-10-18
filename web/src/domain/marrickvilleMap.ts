import data from './marrickvilleMap.json'

/**
 * Margaret's streets around 151.155, −33.911 from OpenStreetMap (© OpenStreetMap contributors, ODbL), pre-processed
 * into map units of 2.5 m, origin at the plate's south-west corner, +y north: building footprints with heights,
 * road centrelines with widths, rail, parks, water, generated park and street trees, the anchors of the home map's
 * labels (in `homeMap.labels` order, null when off the plate) and David's walking route to her door along the streets.
 */
export interface StreetMap {
  /** [west, south, east, north]. */
  plate: [number, number, number, number]
  /** Metres per map unit. */
  unit: number
  size: [number, number]
  /** Footprint, height (units), OSM `building` value, `home` / `david` for their houses, `far` beyond 700 m of hers. */
  buildings: { r: [number, number][]; h: number; k: string; role: string; far: boolean }[]
  /** Centreline and width (units); `major` for primary to tertiary roads. */
  roads: { w: number; major: boolean; pts: [number, number][] }[]
  rails: [number, number][][]
  greens: [number, number][][]
  water: [number, number][][]
  railLand: [number, number][][]
  /** [x, y, crown radius, 1 for a jacaranda]. */
  trees: [number, number, number, number][]
  /** [x, y] or, for a street, [x, y, direction in radians]. */
  labels: ([number, number] | [number, number, number] | null)[]
  davidRoute: [number, number][]
  /** David's route length in metres. */
  davidRouteM: number
}

export const MARRICKVILLE_MAP = data as unknown as StreetMap

const [W0, S0, , N0] = MARRICKVILLE_MAP.plate
const COS = Math.cos((((S0 + N0) / 2) * Math.PI) / 180)

/** lat/lng → map units. */
export const streetPoint = (lat: number, lng: number): [number, number] => [
  ((lng - W0) * COS * 111320) / MARRICKVILLE_MAP.unit,
  ((lat - S0) * 110540) / MARRICKVILLE_MAP.unit,
]
