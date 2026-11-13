import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { SlotWindow } from '../capacity/capacity.constants';
import { ASSIGNABLE_STATUS, type AssignableBooking, type AssignOutcome, type Notification } from './assignment.model';
import type { AssignmentRepository } from './assignment.repository';

interface Row {
  id: string;
  customer_id: string;
  day: string;
  slot_window: SlotWindow;
  status: string;
  technician_id: string | null;
}

const COLUMNS = 'id, customer_id, day::text AS day, slot_window, status, technician_id';
const SOONEST = 'ORDER BY day, slot_window, id';

const toBooking = (r: Row): AssignableBooking => ({
  id: r.id,
  customerId: r.customer_id,
  day: r.day,
  window: r.slot_window,
  status: r.status,
  technicianId: r.technician_id,
});

export class PgAssignmentRepository implements AssignmentRepository {
  constructor(private readonly pool: Pool) {}

  async listBookings(filter: 'unassigned' | 'assigned'): Promise<AssignableBooking[]> {
    const where =
      filter === 'unassigned' ? `technician_id IS NULL AND status = '${ASSIGNABLE_STATUS}'` : 'technician_id IS NOT NULL';
    const { rows } = await this.pool.query<Row>(`SELECT ${COLUMNS} FROM bookings WHERE ${where} ${SOONEST}`);
    return rows.map(toBooking);
  }

  async getBooking(id: string): Promise<AssignableBooking | null> {
    const { rows } = await this.pool.query<Row>(`SELECT ${COLUMNS} FROM bookings WHERE id = $1`, [id]);
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async bookingsHeldOn(technicianId: string, day: string, exceptBookingId: string): Promise<AssignableBooking[]> {
    const { rows } = await this.pool.query<Row>(
      `SELECT ${COLUMNS} FROM bookings WHERE technician_id = $1 AND day = $2 AND id <> $3 ${SOONEST}`,
      [technicianId, day, exceptBookingId],
    );
    return rows.map(toBooking);
  }

  async assign(bookingId: string, technicianId: string): Promise<AssignOutcome> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // The row lock serialises concurrent assignments, so the previous technician is read reliably.
      const { rows } = await client.query<Row>(`SELECT ${COLUMNS} FROM bookings WHERE id = $1 FOR UPDATE`, [bookingId]);
      if (!rows.length) {
        await client.query('ROLLBACK');
        return { outcome: 'not_found' };
      }
      const current = toBooking(rows[0]);
      if (current.status !== ASSIGNABLE_STATUS) {
        await client.query('ROLLBACK');
        return { outcome: 'locked', booking: current };
      }
      await client.query('UPDATE bookings SET technician_id = $2 WHERE id = $1', [bookingId, technicianId]);
      const notified: Notification[] = [{ technicianId, bookingId, kind: 'assigned' }];
      if (current.technicianId) notified.push({ technicianId: current.technicianId, bookingId, kind: 'removed' });
      for (const n of notified) {
        await client.query(
          'INSERT INTO technician_notifications (id, technician_id, booking_id, kind) VALUES ($1, $2, $3, $4)',
          [randomUUID(), n.technicianId, n.bookingId, n.kind],
        );
      }
      await client.query('COMMIT');
      return { outcome: 'assigned', booking: { ...current, technicianId }, notified };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
