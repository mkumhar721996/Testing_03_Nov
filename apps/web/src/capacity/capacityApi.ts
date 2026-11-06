import { identityHeaders } from './identity'

export interface DayRow {
  day: string
  limit: number | null
  booked: number
  placesLeft: number
}

export interface DaySlots {
  day: string
  limit: number | null
  placesLeft: number
  slots: { window: string; bookable: boolean }[]
}

export interface DayBooking {
  id: string
  customerId: string
  window: string
  status: string
  customerName: string | null
  phone: string | null
  address: string | null
  service: string | null
  engineer: string | null
}

export interface CapacityApi {
  fetchVisitLimits(fromDay: string, days: number): Promise<DayRow[]>
  putVisitLimit(day: string, limit: number): Promise<DayRow>
  fetchSlots(day: string): Promise<DaySlots>
  fetchDayBookings(day: string): Promise<DayBooking[]>
}

/** The server refused the request because the signed-in user is not an admin (HTTP 403). */
export class NotAdminError extends Error {
  constructor() {
    super('Only admins can change visit limits')
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...identityHeaders() },
  })
  if (res.status === 403) throw new NotAdminError()
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return (await res.json()) as T
}

export const fetchVisitLimits = (fromDay: string, days: number) =>
  request<DayRow[]>(`/visit-limits?from=${fromDay}&days=${days}`)

export const putVisitLimit = (day: string, limit: number) =>
  request<DayRow>(`/visit-limits/${day}`, { method: 'PUT', body: JSON.stringify({ limit }) })

export const fetchSlots = (day: string) => request<DaySlots>(`/slots/${day}`)

export const fetchDayBookings = (day: string) => request<DayBooking[]>(`/visit-limits/${day}/bookings`)

export const capacityApi: CapacityApi = { fetchVisitLimits, putVisitLimit, fetchSlots, fetchDayBookings }
