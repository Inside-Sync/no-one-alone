/** Gradient that records its stops as plain data so call logs can be compared. */
class Grad {
  stops: [number, string][] = []
  constructor(public kind: string, public args: unknown[]) {}
  addColorStop(o: number, c: string) {
    this.stops.push([o, c])
  }
}

/** A recording stand-in for CanvasRenderingContext2D (jsdom has no canvas). */
export interface FakeCtx extends CanvasRenderingContext2D {
  calls: { fn: string; args: unknown[] }[]
  sets: { prop: string; value: unknown }[]
  count(fn: string): number
}

export function fakeCtx(): FakeCtx {
  const calls: FakeCtx['calls'] = []
  const sets: FakeCtx['sets'] = []
  const store: Record<string, unknown> = { canvas: { width: 800, height: 600 } }
  const handler: ProxyHandler<object> = {
    get(_t, prop: string) {
      if (prop === 'calls') return calls
      if (prop === 'sets') return sets
      if (prop === 'count') return (fn: string) => calls.filter((c) => c.fn === fn).length
      if (prop in store) return store[prop]
      return (...args: unknown[]) => {
        calls.push({ fn: prop, args })
        if (prop === 'measureText') return { width: String(args[0]).length * 6 }
        if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return new Grad(prop, args)
        return undefined
      }
    },
    set(_t, prop: string, value) {
      store[prop] = value
      sets.push({ prop, value })
      return true
    },
    has: () => true,
  }
  return new Proxy({}, handler) as FakeCtx
}

/** Make every `canvas.getContext('2d')` return a fresh fake. */
export function mockCanvas(): FakeCtx[] {
  const made: FakeCtx[] = []
  HTMLCanvasElement.prototype.getContext = function () {
    const c = fakeCtx()
    made.push(c)
    return c
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
  return made
}

export function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: reduce && q.includes('reduce'),
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

/** Give every element a 400×300 box so scenes have a size to draw at. */
export function mockLayout(w = 400, h = 300) {
  Element.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, left: 0, top: 0, right: w, bottom: h, width: w, height: h, toJSON() {} } as DOMRect
  }
}

/** Manual requestAnimationFrame queue. */
export function mockRaf() {
  let queue: FrameRequestCallback[] = []
  let now = 1000
  let requested = 0
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    requested++
    queue.push(cb)
    return queue.length
  }) as typeof window.requestAnimationFrame
  window.cancelAnimationFrame = (() => {
    queue = []
  }) as typeof window.cancelAnimationFrame
  return {
    get requested() {
      return requested
    },
    get pending() {
      return queue.length
    },
    flush(ms = 16) {
      now += ms
      const q = queue
      queue = []
      q.forEach((cb) => cb(now))
    },
  }
}

/** jsdom has no PointerEvent; a MouseEvent subclass carries clientX/Y and pointerType. */
export function polyfillPointerEvent() {
  if (typeof window.PointerEvent === 'function') return
  class PointerEventPoly extends MouseEvent {
    pointerType: string
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerType = init.pointerType ?? 'mouse'
    }
  }
  window.PointerEvent = PointerEventPoly as unknown as typeof PointerEvent
}
