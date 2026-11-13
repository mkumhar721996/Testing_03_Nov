import type { AssignableBooking, AssignOutcome } from './assignment.model';

export const ASSIGNMENT_REPOSITORY = Symbol('ASSIGNMENT_REPOSITORY');

export interface AssignmentRepository {
  /** Soonest first. Unassigned means no technician and status confirmed; assigned means a technician is set. */
  listBookings(filter: 'unassigned' | 'assigned'): Promise<AssignableBooking[]>;
  getBooking(id: string): Promise<AssignableBooking | null>;
  /** Other bookings the technician holds on `day`. */
  bookingsHeldOn(technicianId: string, day: string, exceptBookingId: string): Promise<AssignableBooking[]>;
  /** Atomic: the booking and its notifications are written together or not at all. */
  assign(bookingId: string, technicianId: string): Promise<AssignOutcome>;
}
