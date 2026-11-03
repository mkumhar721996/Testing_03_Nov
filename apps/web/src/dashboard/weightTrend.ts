export interface WeightReading {
  id?: string
  recordedAt: string
  weightKg: number
}

export interface WeightPoint {
  day: string
  weightKg: number
}

export const TREND_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

const pad = (n: number) => String(n).padStart(2, '0')

const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function toTrendPoints(readings: WeightReading[], now: Date = new Date()): WeightPoint[] {
  const from = now.getTime() - TREND_DAYS * DAY_MS
  const latestByDay = new Map<string, { at: number; weightKg: number }>()
  for (const reading of readings) {
    const at = new Date(reading.recordedAt).getTime()
    if (Number.isNaN(at) || at < from || at > now.getTime()) continue
    const day = localDay(new Date(at))
    const seen = latestByDay.get(day)
    if (!seen || at >= seen.at) latestByDay.set(day, { at, weightKg: reading.weightKg })
  }
  return [...latestByDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, { weightKg }]) => ({ day, weightKg }))
}

export async function fetchWeightReadings(signal?: AbortSignal): Promise<WeightReading[]> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}/patients/me/readings?type=weight&days=${TREND_DAYS}`, { signal })
  if (!res.ok) throw new Error(`Weight readings failed: ${res.status}`)
  return (await res.json()) as WeightReading[]
}
