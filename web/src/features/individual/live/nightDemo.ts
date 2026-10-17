/** The top bar's Night alert demo: dispatched on `window` so an Emergency page already on screen starts it too. */
export const NIGHT_DEMO = 'noa:night-demo'

/** The URL form (`?demo=night`), for when the Emergency page mounts after the click. */
export const NIGHT_DEMO_PATH = '/individual/live?demo=night'

export const startNightDemo = (): void => { window.dispatchEvent(new Event(NIGHT_DEMO)) }
