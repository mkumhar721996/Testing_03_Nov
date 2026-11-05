import type { SpinOutcome } from './spinApi'

export type StoredState = { kind: 'spinning'; startedAt: number } | { kind: 'win'; outcome: SpinOutcome }

const key = (guestId: string) => `slot.state.${guestId}`

/** Unreadable or malformed storage counts as idle (null). */
export function loadState(guestId: string): StoredState | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(key(guestId)) ?? 'null') as StoredState | null
    if (parsed?.kind === 'spinning' && typeof parsed.startedAt === 'number') return parsed
    if (parsed?.kind === 'win' && parsed.outcome?.grid && parsed.outcome.evaluation) return parsed
  } catch {
    // fall through to idle
  }
  return null
}

export function saveState(guestId: string, state: StoredState) {
  try {
    localStorage.setItem(key(guestId), JSON.stringify(state))
  } catch {
    // storage full or blocked: the screen still works, it just won't survive a reload
  }
}

export function clearState(guestId: string) {
  try {
    localStorage.removeItem(key(guestId))
  } catch {
    // nothing to clear
  }
}
