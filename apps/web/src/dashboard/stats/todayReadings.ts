import { isOnLocalDay, localDayBounds, type Reading } from './todayStats'

export async function fetchTodayReadings(now: Date, signal?: AbortSignal): Promise<Reading[]> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const { from, to } = localDayBounds(now)
  const res = await fetch(`${base}/readings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { signal })
  if (!res.ok) throw new Error(`Today's readings failed: ${res.status}`)
  const readings = (await res.json()) as Reading[]
  return readings.filter((r) => isOnLocalDay(r.loggedAt, now))
}
