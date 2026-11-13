import type { SlotWindow } from '../capacity/capacity.constants';

export interface AssignableBooking {
  id: string;
  customerId: string;
  /** YYYY-MM-DD */
  day: string;
  window: SlotWindow;
  status: string;
  technicianId: string | null;
}

export interface Notification {
  technicianId: string;
  bookingId: string;
  kind: 'assigned' | 'removed';
}

export type AssignOutcome =
  | { outcome: 'assigned'; booking: AssignableBooking; notified: Notification[] }
  | { outcome: 'not_found' }
  /** on_the_way, in_progress, completed or any other non-confirmed status. */
  | { outcome: 'locked'; booking: AssignableBooking };

/** Only a booking in this state can be assigned or reassigned. */
export const ASSIGNABLE_STATUS = 'confirmed';
