/**
 * Small-cell suppression for the Department of Health view (aggregated, de-identified figures).
 *
 * The rule, kept simple so it can be explained in one breath:
 *  1. A count below `MIN_CELL` (10) is never shown. It is replaced by "<10" (see `<Suppressed>`), not by 0.
 *  2. A rate (percent, days to treatment...) is hidden when the group it is computed from has fewer than 10 people,
 *     because a rate over a handful of people points at individuals.
 *  3. Complementary suppression: when a split is shown next to its total (two-way or stacked), hiding one cell would let
 *     anyone back-calculate it (total minus the rest). So if exactly one cell is hidden, the smallest other cell is hidden
 *     too; the reader can then only recover the sum of the two, never either one.
 */
export const MIN_CELL = 10

/** True when a count must not be shown. */
export function isSuppressed(n: number): boolean {
  return n < MIN_CELL
}

/** The count, or null when it is under 10. */
export function suppressCount(n: number): number | null {
  return isSuppressed(n) ? null : n
}

/** A rate, or null when the denominator it comes from is under 10. */
export function suppressRate(rate: number, denominator: number): number | null {
  return isSuppressed(denominator) ? null : rate
}

/**
 * The cells of a split that is shown with its total: each under 10 becomes null; when exactly one is hidden, the smallest
 * remaining cell is hidden too (ties: the first), so the hidden one cannot be recovered from the total.
 */
export function suppressSplit(cells: readonly number[]): (number | null)[] {
  const out: (number | null)[] = cells.map(suppressCount)
  const hidden = out.filter((c) => c === null).length
  if (hidden === 1 && cells.length > 1) {
    let pick = -1
    out.forEach((c, i) => { if (c !== null && (pick < 0 || c < (out[pick] as number))) pick = i })
    if (pick >= 0) out[pick] = null
  }
  return out
}

/** Leading count of a text such as "41 people" or "1,210 on diabetes medicines"; null when it does not start with one. */
export function leadingCount(text: string): number | null {
  const m = /^\s*(\d[\d,]*)(?!\d)/.exec(text)
  return m ? Number(m[1].replaceAll(',', '')) : null
}
