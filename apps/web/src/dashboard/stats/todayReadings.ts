import { apiFetch } from '../../auth/apiFetch'
import { isOnLocalDay, localDayBounds, type Reading } from './todayStats'

export async function fetchTodayReadings(now: Date, signal?: AbortSignal): Promise<Reading[]> {
  const { from, to } = localDayBounds(now)
  const res = await apiFetch(`/readings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { signal })
  if (!res.ok) throw new Error(`Today's readings failed: ${res.status}`)
  const readings = (await res.json()) as Reading[]
  return readings.filter((r) => isOnLocalDay(r.loggedAt, now))
}
