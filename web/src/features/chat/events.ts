/** Dispatched on `window` by other "Ask Noa" buttons (the Emergency page's agent card) to open the chat panel. */
export const OPEN_CHAT = 'noa:open-chat'

export const openChat = (): void => { window.dispatchEvent(new Event(OPEN_CHAT)) }
