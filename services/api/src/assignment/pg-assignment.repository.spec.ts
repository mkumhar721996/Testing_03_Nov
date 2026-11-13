import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgCapacityRepository } from '../capacity/pg-capacity.repository';
import { PgTechnicianRepository } from '../technicians/pg-technician.repository';
import { PgAssignmentRepository } from './pg-assignment.repository';

const url = process.env.TEST_DATABASE_URL;
const migration = (name: string) => readFileSync(join(__dirname, '../../migrations', name), 'utf8');

let counter = Math.floor(Math.random() * 20000);
/** A fresh far-future day so runs never collide. */
function freshDay(): string {
  return new Date(Date.UTC(2100, 0, 1) + counter++ * 86_400_000).toISOString().slice(0, 10);
}

describe.skipIf(!url)('PgAssignmentRepository (set TEST_DATABASE_URL to run)', () => {
  let pool: Pool;
  let repo: PgAssignmentRepository;
  let techs: PgTechnicianRepository;

  const technician = async () =>
    (await techs.create({ name: 'Tech', loginEmail: `${randomUUID()}@x.example` })).id;

  async function bookingFixture(opts: { technicianId?: string | null; status?: string; day?: string } = {}) {
    const id = randomUUID();
    const day = opts.day ?? freshDay();
    await pool.query(
      `INSERT INTO bookings (id, day, slot_window, customer_id, status, technician_id)
       VALUES ($1, $2, '08:00-11:00', 'c1', $3, $4)`,
      [id, day, opts.status ?? 'confirmed', opts.technicianId ?? null],
    );
    return { id, day };
  }

  const notifications = async (bookingId: string) =>
    (await pool.query('SELECT technician_id, kind FROM technician_notifications WHERE booking_id = $1', [bookingId]))
      .rows;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    for (const m of [
      '004_technicians.sql',
      '004_visit_limits_and_bookings.sql',
      '005_jobs.sql',
      '006_booking_assignment.sql',
    ]) {
      await pool.query(migration(m));
    }
    repo = new PgAssignmentRepository(pool);
    techs = new PgTechnicianRepository(pool);
  });
  afterAll(async () => {
    await pool?.end();
  });

  it('lists an unassigned booking and not an assigned one (AC1, AC2)', async () => {
    const a = await bookingFixture();
    const b = await bookingFixture({ technicianId: await technician() });
    const ids = (await repo.listBookings('unassigned')).map((x) => x.id);
    expect(ids).toContain(a.id);
    expect(ids).not.toContain(b.id);
    expect((await repo.listBookings('assigned')).map((x) => x.id)).toContain(b.id);
  });

  it('assigns, stores the technician and one assigned notification (AC3, AC8)', async () => {
    const tech = await technician();
    const b = await bookingFixture();
    const res = await repo.assign(b.id, tech);
    expect(res).toMatchObject({ outcome: 'assigned', notified: [{ technicianId: tech, bookingId: b.id, kind: 'assigned' }] });
    const { rows } = await pool.query('SELECT technician_id FROM bookings WHERE id = $1', [b.id]);
    expect(rows[0].technician_id).toBe(tech);
    expect(await notifications(b.id)).toEqual([{ technician_id: tech, kind: 'assigned' }]);
  });

  it('reassigns and notifies both technicians (AC4, AC9, AC13)', async () => {
    const techA = await technician();
    const techB = await technician();
    const b = await bookingFixture({ technicianId: techA });
    const res = await repo.assign(b.id, techB);
    expect(res).toMatchObject({ outcome: 'assigned', booking: { technicianId: techB } });
    if (res.outcome !== 'assigned') throw new Error('expected assigned');
    expect(res.notified).toContainEqual({ technicianId: techB, bookingId: b.id, kind: 'assigned' });
    expect(res.notified).toContainEqual({ technicianId: techA, bookingId: b.id, kind: 'removed' });
    expect(await notifications(b.id)).toHaveLength(2);
  });

  it.each(['on_the_way', 'in_progress', 'completed'])(
    'refuses reassigning a %s booking and writes nothing (AC11, AC12)',
    async (status) => {
      const techA = await technician();
      const techB = await technician();
      const b = await bookingFixture({ technicianId: techA, status });
      expect((await repo.assign(b.id, techB)).outcome).toBe('locked');
      expect((await repo.getBooking(b.id))?.technicianId).toBe(techA);
      expect(await notifications(b.id)).toEqual([]);
    },
  );

  it('answers not_found for an unknown booking', async () => {
    expect((await repo.assign(randomUUID(), await technician())).outcome).toBe('not_found');
  });

  it("lists the jobs a technician holds on a day, except the given booking (AC5, AC7)", async () => {
    const tech = await technician();
    const day = freshDay();
    const held = await bookingFixture({ technicianId: tech, day });
    const target = await bookingFixture({ day });
    expect((await repo.bookingsHeldOn(tech, day, target.id)).map((x) => x.id)).toEqual([held.id]);
    expect((await repo.bookingsHeldOn(tech, day, held.id)).map((x) => x.id)).toEqual([]);
  });

  it('applying 006 again keeps existing bookings, capacity and jobs (migration safety)', async () => {
    const day = freshDay();
    const capacity = new PgCapacityRepository(pool);
    await capacity.setLimit(day, 5);
    const b = await bookingFixture({ day });
    const tech = await technician();
    const jobId = randomUUID();
    await pool.query(
      `INSERT INTO jobs (id, title, customer, scheduled_date, technician_id) VALUES ($1, 't', 'c', $2, $3)`,
      [jobId, day, tech],
    );
    await pool.query(migration('006_booking_assignment.sql'));
    await pool.query(migration('006_booking_assignment.sql'));
    expect(await repo.getBooking(b.id)).toMatchObject({ technicianId: null });
    expect((await repo.listBookings('unassigned')).map((x) => x.id)).toContain(b.id);
    expect(await capacity.getDay(day)).toEqual({ day, limit: 5, booked: 1 });
    expect((await techs.jobsHeldBy(tech)).map((j) => j.id)).toContain(jobId);
  });
});
