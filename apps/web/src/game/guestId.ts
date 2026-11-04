const KEY = 'slot-guest-id'

/** The player's identity until real sign-in exists: a UUID kept in localStorage. */
export function getGuestId(): string {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
