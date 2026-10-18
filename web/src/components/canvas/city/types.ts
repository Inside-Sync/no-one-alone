import type { MapIcon } from './icons'

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
  /**
   * Sort by this point's depth instead of the face's own, so one solid's faces paint together (its own depth then
   * orders them inside the solid, far walls first).
   */
  key?: Pt3
  /** Paint after the solid's other faces (its roof). */
  last?: boolean
  /** Stroke width (default 0.5). */
  lw?: number
  /** Skip when it faces away from the camera (wound counter-clockwise seen from outside, bottom edge first). */
  cull?: boolean
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
  /** Glyph on a modern marker (`CityModel.modern`). */
  icon?: MapIcon
  /** Hit-only: nothing is drawn, the tap target sits on the point (its label is a `CityText`). */
  ghost?: boolean
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
  /** Direction of the street it names (radians in map space): a modern map sets the text along it. */
  a?: number
}

/** Text printed on a surface, e.g. a suburb's roof; drawn over the map, far ones first. */
export interface CityText {
  x: number
  y: number
  z: number
  /** Big line (the value). */
  t: string
  /** Small line under it (the name). */
  sub: string
  /** Light text, for dark surfaces. */
  light?: boolean
}

/** A ground line (a road, a rail) drawn round-capped under the solids; width in map units. */
export interface CityLine {
  pts: [number, number][]
  w: number
  c: string
  /** Dash pattern in map units. */
  dash?: [number, number]
}

export interface CityModel {
  faces: Face[]
  ground: Face[]
  trees: Tree[]
  pins: CityPin[]
  rings?: CityRing[]
  routes?: CityRoute[]
  labels?: CityLabel[]
  texts?: CityText[]
  /** Drawn in order after the ground, before the faces. */
  lines?: CityLine[]
  /** Map-app styling: icon markers with label cards, street names along the streets, layered tree crowns. */
  modern?: boolean
}
