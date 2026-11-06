import { randomUUID } from 'node:crypto';
import type { SlotWindow } from './capacity.constants';
import type { CapacityRepository, DayCapacity } from './capacity.repository';

/** In-memory repository for unit tests. */
export class FakeCapacityRepository implements CapacityRepository {
  limits = new Map<string, number>();
  bookings: { id: string; day: string; customerId: string; window: SlotWindow; status: string }[] = [];

  async setLimit(day: string, limit: number) {
    this.limits.set(day, limit);
  }

  async getDay(day: string): Promise<DayCapacity> {
    return {
      day,
      limit: this.limits.get(day) ?? null,
      booked: this.bookings.filter((b) => b.day === day && b.status === 'confirmed').length,
    };
  }

  listDays(days: string[]) {
    return Promise.all(days.map((d) => this.getDay(d)));
  }

  async book(day: string, window: SlotWindow, customerId: string) {
    const { limit, booked } = await this.getDay(day);
    if (limit === null) return { outcome: 'no_limit' as const };
    if (booked >= limit) return { outcome: 'full' as const };
    const id = randomUUID();
    this.bookings.push({ id, day, customerId, window, status: 'confirmed' });
    return { outcome: 'confirmed' as const, bookingId: id };
  }

  async listBookings(day: string) {
    return this.bookings
      .filter((b) => b.day === day)
      .map((b) => ({
        id: b.id,
        customerId: b.customerId,
        window: b.window,
        status: b.status,
        customerName: null,
        phone: null,
        address: null,
        service: null,
        engineer: null,
      }));
  }
}
