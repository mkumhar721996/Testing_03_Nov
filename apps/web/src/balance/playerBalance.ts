import { getGuestId } from './guestId'

export async function fetchBalance(signal?: AbortSignal): Promise<number> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}/balance`, { signal, headers: { 'x-guest-id': getGuestId() } })
  if (!res.ok) throw new Error(`Balance failed: ${res.status}`)
  return ((await res.json()) as { balance: number }).balance
}
