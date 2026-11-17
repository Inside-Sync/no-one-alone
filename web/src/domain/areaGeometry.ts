import type { Area } from '@/data/government.types'

/**
 * Where the 17 Abu Dhabi areas stand on the district map. The design lays them out on a 5 × 4 grid (`col`, `row` of each
 * area); this turns a cell into a tile and a column footprint in map units for the 3D renderer, and into a lng/lat ring
 * for the Google 3D map. The footprints are simple squares, not survey boundaries.
 */

/** Plate size in map units; the `district` camera preset is built for 820 × 820. */
export const DISTRICT_SIZE: [number, number] = [820, 820]

const COLS = 5
const ROWS = 4
/** Distance between two cell centres, the tile drawn on the ground and the column standing on it (map units). */
const PITCH = 90
const TILE = 80
const COLUMN = 56

const GRID_W = COLS * PITCH
const GRID_H = ROWS * PITCH
/** South-west corner of the grid, so the grid sits in the middle of the plate. */
const ORIGIN_X = (DISTRICT_SIZE[0] - GRID_W) / 2
const ORIGIN_Y = (DISTRICT_SIZE[1] - GRID_H) / 2 - 14

type Ring = [number, number][]

const square = (cx: number, cy: number, size: number): Ring => {
  const h = size / 2
  return [[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]]
}

/** Centre of an area's cell in map units. */
export function areaCentre(a: Pick<Area, 'col' | 'row'>): [number, number] {
  return [ORIGIN_X + (a.col + 0.5) * PITCH, ORIGIN_Y + (a.row + 0.5) * PITCH]
}

/** Footprint of the column that carries the area's value. */
export function areaColumn(a: Pick<Area, 'col' | 'row'>): Ring {
  return square(...areaCentre(a), COLUMN)
}

/** The flat tile the column stands on. */
export function areaTile(a: Pick<Area, 'col' | 'row'>): Ring {
  return square(...areaCentre(a), TILE)
}

/** The land under the whole grid, a little wider than the tiles. */
export function areaLand(): Ring {
  const m = 12
  return [[ORIGIN_X - m, ORIGIN_Y - m], [ORIGIN_X + GRID_W + m, ORIGIN_Y - m], [ORIGIN_X + GRID_W + m, ORIGIN_Y + GRID_H + m], [ORIGIN_X - m, ORIGIN_Y + GRID_H + m]]
}

/** The grid is laid over the island of Abu Dhabi and the mainland east of it: south-west corner and size of one cell. */
const GEO_WEST = 54.28
const GEO_SOUTH = 24.2
const GEO_CELL_LNG = 0.055
const GEO_CELL_LAT = 0.05

/** lng/lat ring of an area's column for the Google 3D map. */
export function areaGeoRing(a: Pick<Area, 'col' | 'row'>): Ring {
  return areaColumn(a).map(([x, y]) => [
    GEO_WEST + ((x - ORIGIN_X) / PITCH) * GEO_CELL_LNG,
    GEO_SOUTH + ((y - ORIGIN_Y) / PITCH) * GEO_CELL_LAT,
  ])
}
