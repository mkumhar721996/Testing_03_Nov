import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { MAX_VISIT_LIMIT, WINDOWS, type SlotWindow } from './capacity.constants';
import {
  CAPACITY_REPOSITORY,
  type BookingView,
  type CapacityRepository,
  type DayCapacity,
  type HomeVisitDetails,
} from './capacity.repository';
import { assertAdmin, type Identity } from './identity';

export interface DayView extends DayCapacity {
  placesLeft: number;
}

export interface DaySlots {
  day: string;
  limit: number | null;
  placesLeft: number;
  slots: { window: SlotWindow; bookable: boolean }[];
}

export function assertDay(day: unknown): string {
  if (typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const parsed = new Date(`${day}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day) return day;
  }
  throw new BadRequestException('day must be a real date in YYYY-MM-DD form');
}

export function toDayView(d: DayCapacity): DayView {
  return { ...d, placesLeft: Math.max(0, (d.limit ?? 0) - d.booked) };
}

@Injectable()
export class CapacityService {
  constructor(@Inject(CAPACITY_REPOSITORY) private readonly repo: CapacityRepository) {}

  async setLimit(identity: Identity, day: string, limit: number): Promise<void> {
    assertAdmin(identity);
    assertDay(day);
    if (!Number.isInteger(limit) || limit < 0 || limit > MAX_VISIT_LIMIT) {
      throw new BadRequestException(`limit must be a whole number from 0 to ${MAX_VISIT_LIMIT}`);
    }
    await this.repo.setLimit(day, limit);
  }

  async dayView(day: string): Promise<DayView> {
    return toDayView(await this.repo.getDay(assertDay(day)));
  }

  async listDays(identity: Identity, days: string[]): Promise<DayView[]> {
    assertAdmin(identity);
    return (await this.repo.listDays(days.map(assertDay))).map(toDayView);
  }

  /** The limit applies to the day total: either every window is bookable or none is. */
  async slotsFor(day: string): Promise<DaySlots> {
    const view = await this.dayView(day);
    const bookable = view.limit !== null && view.booked < view.limit;
    return {
      day: view.day,
      limit: view.limit,
      placesLeft: view.placesLeft,
      slots: WINDOWS.map((window) => ({ window, bookable })),
    };
  }

  async book(
    identity: Identity,
    day: string,
    window: string,
    details?: HomeVisitDetails,
  ): Promise<{ bookingId: string }> {
    assertDay(day);
    if (!(WINDOWS as readonly string[]).includes(window)) {
      throw new BadRequestException(`window must be one of ${WINDOWS.join(', ')}`);
    }
    const result = await this.repo.book(day, window as SlotWindow, identity.userId, details);
    if (result.outcome === 'confirmed') return { bookingId: result.bookingId };
    throw new ConflictException(
      result.outcome === 'full' ? 'No places left on this day.' : 'This day is not open for booking.',
    );
  }

  async bookingsFor(identity: Identity, day: string): Promise<BookingView[]> {
    assertAdmin(identity);
    return this.repo.listBookings(assertDay(day));
  }
}
