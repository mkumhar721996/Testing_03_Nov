import { getGuestId } from '../balance/guestId'
import type { ApiSymbol } from './symbols'

export interface SpinOutcome {
  grid: ApiSymbol[][]
  bet: number
  evaluation: { totalWin: number; wins: PaylineWin[] }
  jackpotTrigger: boolean
}

export interface PaylineWin {
  payline: number
  symbol: ApiSymbol
  count: 3 | 4 | 5
  win: number
}

/** The player's most recent recorded spin, or null when there is none. */
export async function getLatestSpin(
  guestId: string,
  signal?: AbortSignal,
): Promise<(SpinOutcome & { spunAt: string }) | null> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}/spin/latest`, { headers: { 'x-guest-id': guestId }, signal })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Latest spin failed: ${res.status}`)
  return (await res.json()) as SpinOutcome & { spunAt: string }
}

export { getGuestId }

/** The server refused the bet (HTTP 400); the message is the server's wording. */
export class BetRejectedError extends Error {}

export async function postSpin(bet: number, guestId: string, signal?: AbortSignal): Promise<SpinOutcome> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}/spin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-guest-id': guestId },
    body: JSON.stringify({ bet }),
    signal,
  })
  if (res.status === 400) {
    const body = (await res.json().catch(() => null)) as { message?: unknown } | null
    if (typeof body?.message === 'string') throw new BetRejectedError(body.message)
  }
  if (!res.ok) throw new Error(`Spin failed: ${res.status}`)
  return (await res.json()) as SpinOutcome
}
