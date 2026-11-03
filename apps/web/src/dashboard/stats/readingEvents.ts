import type { Reading } from './todayStats'

type Listener = (reading: Reading) => void

const listeners = new Set<Listener>()

/** Call after a reading is saved successfully so open dashboards update without a reload. */
export function publishReadingSaved(reading: Reading): void {
  for (const fn of [...listeners]) fn(reading)
}

/** Number of active subscribers; lets tests prove cleanup actually unsubscribes. */
export function readingSavedListenerCount(): number {
  return listeners.size
}

export function subscribeReadingSaved(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
