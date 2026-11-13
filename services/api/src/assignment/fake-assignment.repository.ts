import { ASSIGNABLE_STATUS, type AssignableBooking, type AssignOutcome, type Notification } from './assignment.model';
import type { AssignmentRepository } from './assignment.repository';

/** In-memory repository for unit tests. */
export class FakeAssignmentRepository implements AssignmentRepository {
  bookings: AssignableBooking[] = [];
  notifications: Notification[] = [];

  private sorted(list: AssignableBooking[]) {
    return [...list].sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id));
  }

  async listBookings(filter: 'unassigned' | 'assigned') {
    return this.sorted(
      this.bookings.filter((b) =>
        filter === 'unassigned' ? b.technicianId === null && b.status === ASSIGNABLE_STATUS : b.technicianId !== null,
      ),
    );
  }

  async getBooking(id: string) {
    const booking = this.bookings.find((b) => b.id === id);
    return booking ? { ...booking } : null;
  }

  async bookingsHeldOn(technicianId: string, day: string, exceptBookingId: string) {
    return this.sorted(
      this.bookings.filter((b) => b.technicianId === technicianId && b.day === day && b.id !== exceptBookingId),
    );
  }

  async assign(bookingId: string, technicianId: string): Promise<AssignOutcome> {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) return { outcome: 'not_found' };
    if (booking.status !== ASSIGNABLE_STATUS) return { outcome: 'locked', booking: { ...booking } };
    const previous = booking.technicianId;
    booking.technicianId = technicianId;
    const notified: Notification[] = [{ technicianId, bookingId, kind: 'assigned' }];
    if (previous) notified.push({ technicianId: previous, bookingId, kind: 'removed' });
    this.notifications.push(...notified);
    return { outcome: 'assigned', booking: { ...booking }, notified };
  }
}
