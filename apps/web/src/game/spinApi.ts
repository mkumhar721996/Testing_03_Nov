import { getGuestId } from './guestId'

export interface FreeGames {
  awarded: number
  remaining: number
}

export interface SpinResponse {
  grid: string[][]
  scatterCount: number
  freeGames: FreeGames
}

const baseUrl = () => (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export async function postSpin(bet: number, signal?: AbortSignal): Promise<SpinResponse> {
  const res = await fetch(`${baseUrl()}/spin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-guest-id': getGuestId() },
    body: JSON.stringify({ bet }),
    signal,
  })
  if (!res.ok) throw new Error(`Spin failed: ${res.status}`)
  return (await res.json()) as SpinResponse
}

export async function fetchFreeGames(signal?: AbortSignal): Promise<{ remaining: number }> {
  const res = await fetch(`${baseUrl()}/spin/free-games`, {
    headers: { 'x-guest-id': getGuestId() },
    signal,
  })
  if (!res.ok) throw new Error(`Free games failed: ${res.status}`)
  return (await res.json()) as { remaining: number }
}
