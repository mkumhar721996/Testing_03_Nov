const KEY = 'guest-id'

// Fallback when localStorage is unavailable, so the page still loads (as a new player).
let memoryId: string | null = null

/** Anonymous player identity: generated once, kept in this browser, sent as `x-guest-id`. */
export function getGuestId(): string {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored) return stored
    const id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    memoryId ??= crypto.randomUUID()
    return memoryId
  }
}
