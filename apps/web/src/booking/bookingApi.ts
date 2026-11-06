import { identityHeaders } from '../capacity/identity'

export interface Category {
  id: string
  name: string
}

export interface Service {
  id: string
  categoryId: string
  name: string
  note: string
}

/** `timeZone` is an IANA name such as Europe/London. */
export interface Address {
  id: string
  label: string
  line: string
  timeZone: string
}

export interface VisitFee {
  amount: number
  currency: string
}

export interface HomeVisitSlots {
  day: string
  timeZone: string
  zoneLabel: string
  slots: { window: string; bookable: boolean }[]
}

export interface HomeVisitInput {
  serviceId: string
  addressId: string
  day: string
  window: string
}

export interface ConfirmedBooking {
  bookingId: string
  status: 'confirmed'
  visitFee: VisitFee
  service: Service
  address: Address
  day: string
  window: string
  zoneLabel: string
}

export interface BookingApi {
  fetchCategories(): Promise<{ categories: Category[]; visitFee: VisitFee }>
  fetchServices(categoryId: string): Promise<Service[]>
  fetchAddresses(): Promise<Address[]>
  fetchHomeVisitSlots(day: string, addressId: string): Promise<HomeVisitSlots>
  postHomeVisit(input: HomeVisitInput): Promise<ConfirmedBooking>
}

/** The visitor is not signed in (HTTP 401). */
export class NotSignedInError extends Error {
  constructor() {
    super('Sign in to book a home visit')
  }
}

/** The slot filled up before the booking was saved (HTTP 409). */
export class SlotTakenError extends Error {
  constructor() {
    super('That slot was just taken')
  }
}

/** The customer has no saved address (HTTP 400). */
export class NoAddressError extends Error {
  constructor() {
    super('Add an address before you book')
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...identityHeaders() },
  })
  if (res.status === 401) throw new NotSignedInError()
  if (res.status === 409) throw new SlotTakenError()
  if (res.status === 400 && init.method === 'POST') {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    if (body.message === 'Add an address before you book.') throw new NoAddressError()
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return (await res.json()) as T
}

export const bookingApi: BookingApi = {
  fetchCategories: () => request('/service-categories'),
  fetchServices: (categoryId) => request(`/service-categories/${encodeURIComponent(categoryId)}/services`),
  fetchAddresses: () => request('/addresses'),
  fetchHomeVisitSlots: (day, addressId) =>
    request(`/home-visit-slots?day=${day}&addressId=${encodeURIComponent(addressId)}`),
  postHomeVisit: (input) => request('/home-visits', { method: 'POST', body: JSON.stringify(input) }),
}
