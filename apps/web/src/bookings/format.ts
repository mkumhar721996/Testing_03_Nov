import type { Booking } from './bookingsApi'

/** The booking's reference: its id, which the server generates and the admin can read out. */
export const bookingRef = (b: Pick<Booking, 'id'>) => b.id.slice(0, 8)

/** Only a confirmed booking can still be assigned or reassigned. */
export const isLocked = (b: Pick<Booking, 'status'>) => b.status !== 'confirmed'

const LABELS: Record<string, string> = {
  confirmed: 'Assigned',
  on_the_way: 'On the way',
  in_progress: 'In progress',
  completed: 'Completed',
}

export function statusLabel(status: string) {
  return LABELS[status] ?? status.replace(/_/g, ' ')
}

/** "Mon 9 Nov" from a YYYY-MM-DD day. */
export function formatDay(day: string) {
  return new Date(`${day}T00:00:00Z`)
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .replace(',', '')
}

export const weekdayName = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
