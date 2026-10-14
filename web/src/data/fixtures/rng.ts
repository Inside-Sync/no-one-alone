/**
 * Port of the prototype's seeded generator `rng(s)` (Park-Miller). The
 * prototype draws several charts from it, so fixtures that derive their series
 * with it reproduce the exact same figures.
 */
export function rng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}
