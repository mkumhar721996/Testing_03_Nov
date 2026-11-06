import type { SlotWindow } from './capacity.constants';

export const CAPACITY_REPOSITORY = Symbol('CAPACITY_REPOSITORY');

export type BookResult =
  | { outcome: 'confirmed'; bookingId: string }
  | { outcome: 'full' }
  | { outcome: 'no_limit' };

/** `limit` is null when no admin has set one for the day. Days are `YYYY-MM-DD` strings. */
export interface DayCapacity {
  day: string;
  limit: number | null;
  booked: number;
}

/** Read-only details the booking drawer shows; no source exists yet, so all are null. */
export interface BookingDetails {
  customerName: string | null;
  phone: string | null;
  address: string | null;
  service: string | null;
  engineer: string | null;
}

export type BookingView = {
  id: string;
  customerId: string;
  window: SlotWindow;
  status: string;
} & BookingDetails;

/** What a home visit booking records beyond the slot; omitted by slot-only callers. */
export interface HomeVisitDetails {
  serviceId: string;
  addressId: string;
  visitFee: number;
  feeCurrency: string;
}

export interface CapacityRepository {
  /** Never touches existing bookings. */
  setLimit(day: string, limit: number): Promise<void>;
  getDay(day: string): Promise<DayCapacity>;
  listDays(days: string[]): Promise<DayCapacity[]>;
  /** Atomic: concurrent bookings for one day serialise, so the limit is never exceeded. */
  book(day: string, window: SlotWindow, customerId: string, details?: HomeVisitDetails): Promise<BookResult>;
  listBookings(day: string): Promise<BookingView[]>;
}
