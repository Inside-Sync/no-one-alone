/**
 * Port of the prototype's seeded generator `rng(s)` (Park-Miller, line 1167).
 * The prototype draws several charts and the procedural Marrickville model
 * from it, so anything seeded with it reproduces the exact same figures.
 */
export function rng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}
