import { listTechnicians, request, ValidationError, type TechnicianSummary } from '../technicians/techniciansApi'

export { NotAdminError, ValidationError } from '../technicians/techniciansApi'

export interface Booking {
  id: string
  customerId: string
  /** YYYY-MM-DD */
  day: string
  window: string
  status: string
  technicianId: string | null
}

export interface TechnicianOption {
  id: string
  name: string
  serviceArea: string | null
  /** Hours on the booking's weekday; null when the technician does not work that day. */
  workingHours: { start: string; end: string } | null
  daysOff: string[]
  jobsOnDay: Booking[]
}

export interface Notification {
  technicianId: string
  bookingId: string
  kind: 'assigned' | 'removed'
}

/** The booking is on the way, in progress or completed, so the server refused the change (HTTP 409). */
export class LockedError extends Error {}

const enc = encodeURIComponent

export const listBookings = (assignment: 'unassigned' | 'assigned') =>
  request<Booking[]>(`/bookings?assignment=${assignment}`)
export const getTechnicianOptions = (bookingId: string) =>
  request<TechnicianOption[]>(`/bookings/${enc(bookingId)}/technician-options`)
export const assignTechnician = async (bookingId: string, technicianId: string) => {
  try {
    return await request<{ booking: Booking; notified: Notification[] }>(`/bookings/${enc(bookingId)}/technician`, {
      method: 'POST',
      body: { technicianId },
    })
  } catch (err) {
    if (err instanceof ValidationError && err.status === 409) throw new LockedError(err.message)
    throw err
  }
}

export type BookingsApi = {
  listBookings: typeof listBookings
  getTechnicianOptions: typeof getTechnicianOptions
  assignTechnician: typeof assignTechnician
  /** Every technician, so a booking held by a deactivated one still shows a name. */
  listTechnicians: () => Promise<TechnicianSummary[]>
}

export const bookingsApi: BookingsApi = { listBookings, getTechnicianOptions, assignTechnician, listTechnicians }
