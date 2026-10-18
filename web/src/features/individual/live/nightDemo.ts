/** The top bar's Night alert demo: dispatched on `window` so an Emergency page already on screen starts it too. */
export const NIGHT_DEMO = 'noa:night-demo'

/** The URL form (`?demo=night`), for when the Emergency page mounts after the click. */
export const NIGHT_DEMO_PATH = '/individual/live?demo=night'

export const startNightDemo = (): void => { window.dispatchEvent(new Event(NIGHT_DEMO)) }

/** The switch turned off: the Emergency page on screen resets its incident and the watch, like its Reset button. */
export const NIGHT_DEMO_STOP = 'noa:night-demo-stop'

export const stopNightDemo = (): void => { window.dispatchEvent(new Event(NIGHT_DEMO_STOP)) }
