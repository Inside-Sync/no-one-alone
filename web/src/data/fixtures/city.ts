import type { CityBlockKind, CityGeometry } from '../types'

/**
 * Geometry inputs for the procedural Marrickville model (`buildSuburb`,
 * prototype lines 1270–1316). Rendering-only data for Task 6; the generator
 * itself (seed 11) is ported there.
 */

/** Terrace wall colours (`WALL`, line 1284). */
export const WALL_COLOURS = ['#efe3cf', '#e8d6bd', '#d9c6a8', '#c97d5d', '#b9674c', '#ece8de', '#cfd8cc', '#dcc7a4', '#e3cdb4'] as const

/** Terrace roof colours (`ROOF`, line 1284). */
export const ROOF_COLOURS = ['#8e4a3a', '#a2563f', '#6f7b80', '#5f6b70', '#9a4f3b', '#7b4234'] as const

/** Shop-front wall colours (line 1286) and awning colours (line 1298). */
export const SHOP_WALL_COLOURS = ['#f1e4c8', '#e9d3b0', '#d8e4e8', '#f3d9c9', '#e2e9d6', '#efe0d0'] as const
export const SHOP_AWNING_COLOURS = ['#d9443f', '#0b7f71', '#2f6fb0', '#c88a05'] as const

export type { CityBlockKind }

/** City blocks: [x0, x1, y0, y1, kind] (line 1274). */
export const CITY_BLOCKS: readonly [number, number, number, number, CityBlockKind][] = [
  [0, 102, 46, 142, 'shops'], [118, 245, 46, 142, 'shops'], [255, 400, 46, 142, 'shops'],
  [0, 102, 158, 265, 'res'], [118, 245, 158, 265, 'res'], [255, 400, 158, 265, 'park'],
  [0, 102, 275, 338, 'res'], [118, 245, 275, 338, 'res'], [255, 400, 275, 338, 'lib'],
  [0, 102, 352, 400, 'res1'], [118, 400, 352, 400, 'res1'],
]

/** Ground colours used by the model (lines 1272–1281). */
export const CITY_GROUND = {
  slabTop: '#e2e8da',
  slabSide: '#b9b09e',
  river: '#86c6d6',
  riverBank: '#b4d79a',
  block: '#d6e3c8',
  park: '#a9d18e',
  oval: ['#cfe7b2', '#bfe09e'],
  road: '#8e979b',
  roadLight: '#a0a8ab',
  rail: '#bdb19e',
  railLine: '#6f665b',
  laneMark: '#efe8cc',
} as const

/** Tree gradients [highlight, shade] (lines 1291–1305). */
export const TREE_COLOURS = {
  street: ['#b8e0a0', '#3f7d4f'],
  jacaranda: ['#d8c6f6', '#7d5fc4'],
  riverside: ['#a9d98f', '#2f6b45'],
} as const

/** Camera presets for each map (lines 1401, 1520, 1676). */
export const CITY_VIEWS = {
  home: { size: [400, 400], yaw: -0.62, cy: 0.6, vpad: 110, zmax: 30, fill: 1.1 },
  watch: { size: [400, 400], yaw: 0.35, cy: 0.6, vpad: 110, zmax: 30, fill: 1.1 },
  district: { size: [820, 820], yaw: 0, pitch: 0.8, cy: 0.54, vpad: 0, zmax: 30, fill: 1, zoom: 1, cover: true, compassY: 70 },
  street: { size: [843, 840], yaw: 0, pitch: 0.8, cy: 0.52, vpad: 0, zmax: 20, fill: 1, zoom: 1, cover: true, compassY: 70 },
} as const

/** Everything the City3D generator needs, served by `getCityScene()`. */
export const cityScene: CityGeometry = {
  blocks: CITY_BLOCKS,
  wallColours: WALL_COLOURS,
  roofColours: ROOF_COLOURS,
  shopWallColours: SHOP_WALL_COLOURS,
  awningColours: SHOP_AWNING_COLOURS,
  ground: CITY_GROUND,
  trees: TREE_COLOURS,
  views: CITY_VIEWS,
}
