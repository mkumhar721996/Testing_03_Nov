import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { SlotWindow } from './capacity.constants';
import type { BookResult, BookingView, CapacityRepository, DayCapacity } from './capacity.repository';

export class PgCapacityRepository implements CapacityRepository {
  constructor(private readonly pool: Pool) {}

  async setLimit(day: string, limit: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO visit_limits (day, visit_limit) VALUES ($1, $2)
       ON CONFLICT (day) DO UPDATE SET visit_limit = EXCLUDED.visit_limit, updated_at = now()`,
      [day, limit],
    );
  }

  async getDay(day: string): Promise<DayCapacity> {
    return (await this.listDays([day]))[0];
  }

  async listDays(days: string[]): Promise<DayCapacity[]> {
    const { rows } = await this.pool.query<{ day: string; visit_limit: number | null; booked: number }>(
      `SELECT d::text AS day,
              (SELECT visit_limit FROM visit_limits WHERE day = d) AS visit_limit,
              (SELECT count(*)::int FROM bookings WHERE day = d AND status = 'confirmed') AS booked
       FROM unnest($1::date[]) AS d`,
      [days],
    );
    const byDay = new Map(rows.map((r) => [r.day, r]));
    return days.map((day) => ({
      day,
      limit: byDay.get(day)?.visit_limit ?? null,
      booked: byDay.get(day)?.booked ?? 0,
    }));
  }

  async book(day: string, window: SlotWindow, customerId: string): Promise<BookResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // The row lock queues concurrent bookings for this day, so each sees the last one's insert.
      const lim = await client.query<{ visit_limit: number }>(
        'SELECT visit_limit FROM visit_limits WHERE day = $1 FOR UPDATE',
        [day],
      );
      if (!lim.rows.length) {
        await client.query('ROLLBACK');
        return { outcome: 'no_limit' };
      }
      const { rows } = await client.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM bookings WHERE day = $1 AND status = 'confirmed'",
        [day],
      );
      if (rows[0].n >= lim.rows[0].visit_limit) {
        await client.query('ROLLBACK');
        return { outcome: 'full' };
      }
      const id = randomUUID();
      await client.query(
        'INSERT INTO bookings (id, day, slot_window, customer_id) VALUES ($1, $2, $3, $4)',
        [id, day, window, customerId],
      );
      await client.query('COMMIT');
      return { outcome: 'confirmed', bookingId: id };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listBookings(day: string): Promise<BookingView[]> {
    const { rows } = await this.pool.query<{
      id: string;
      customer_id: string;
      slot_window: SlotWindow;
      status: string;
    }>('SELECT id, customer_id, slot_window, status FROM bookings WHERE day = $1 ORDER BY created_at, id', [
      day,
    ]);
    return rows.map((r) => ({
      id: r.id,
      customerId: r.customer_id,
      window: r.slot_window,
      status: r.status,
      customerName: null,
      phone: null,
      address: null,
      service: null,
      engineer: null,
    }));
  }
}
