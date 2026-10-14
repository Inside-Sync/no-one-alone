/**
 * Render model of a City3D map. Field names follow the prototype's model
 * objects (`buildSuburb` / `buildDistrict`, lines 1270–1336) so the port can be
 * checked against the original object for object.
 */

export type Pt3 = [number, number, number]

/** A filled polygon: ground tiles (drawn first, unsorted) or faces (depth-sorted). */
export interface Face {
  pts: Pt3[]
  fill: string
  /** Depth bias added after averaging (roofs −0.01, slab sides 9000). */
  bias?: number
  stroke?: string
}

export interface Tree {
  x: number
  y: number
  /** Crown height. */
  h: number
  /** Crown radius. */
  r: number
  /** Radial gradient [highlight, shade]. */
  c: readonly [string, string]
}

export interface CityPin {
  x: number
  y: number
  z: number
  name: string
  /** Second line of the pill. */
  sub: string
  /** Detail shown in the tap toast (prototype `d`). */
  d?: string
  /** Pin colour. */
  c: string
  /** Letter colour on white pins. */
  ink?: string
  /** Letters on the ball. */
  ini: string
  /** Large home pin with a glow. */
  big?: boolean
  /** Pulse phase offset 0..1. */
  ph?: number
  /** Draw as a flat pill tag instead of a ball. */
  tag?: boolean
}

/** Dashed marching circle on the ground (e.g. "5 MIN WALK"). */
export interface CityRing {
  x: number
  y: number
  r: number
  c: string
  label?: string
}

/** Dotted marching route on the ground. */
export interface CityRoute {
  pts: [number, number][]
  c: string
}

/** Street-name chip. */
export interface CityLabel {
  t: string
  x: number
  y: number
  z?: number
  /** Bold. */
  b?: boolean
}

export interface CityModel {
  faces: Face[]
  ground: Face[]
  trees: Tree[]
  pins: CityPin[]
  rings?: CityRing[]
  routes?: CityRoute[]
  labels?: CityLabel[]
}
