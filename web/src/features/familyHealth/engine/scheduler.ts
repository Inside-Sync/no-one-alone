/**
 * Every wait of the journey goes through a scheduler, so the app can use the prototype's real delays (250 / 450 / 1100 ms),
 * reduced motion and tests use none.
 */
export interface Scheduler { wait(ms: number): Promise<void> }

/** Real delays (setTimeout). With `reducedMotion` every wait is zero, like the prototype's `RM`. */
export function realScheduler(opts: { reducedMotion?: boolean } = {}): Scheduler {
  return {
    wait: (ms) => (opts.reducedMotion || ms <= 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, ms))),
  }
}
/** No waits at all (tests). */
export const instantScheduler: Scheduler = { wait: () => Promise.resolve() }
