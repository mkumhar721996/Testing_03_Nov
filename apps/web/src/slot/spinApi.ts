import type { ApiSymbol } from './symbols'

export interface SpinOutcome {
  grid: ApiSymbol[][]
  bet: number
  evaluation: { totalWin: number }
  jackpotTrigger: boolean
}

const GUEST_KEY = 'guestId'

export function getGuestId(): string {
  let id = localStorage.getItem(GUEST_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(GUEST_KEY, id)
  }
  return id
}

export async function postSpin(bet: number, guestId: string, signal?: AbortSignal): Promise<SpinOutcome> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}/spin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-guest-id': guestId },
    body: JSON.stringify({ bet }),
    signal,
  })
  if (!res.ok) throw new Error(`Spin failed: ${res.status}`)
  return (await res.json()) as SpinOutcome
}
