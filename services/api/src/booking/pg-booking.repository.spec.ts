import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgCapacityRepository } from '../capacity/pg-capacity.repository';
import { PgBookingRepository } from './pg-booking.repository';

const url = process.env.TEST_DATABASE_URL;
const migration = (name: string) => readFileSync(join(__dirname, '../../migrations', name), 'utf8');

describe.skipIf(!url)('PgBookingRepository (set TEST_DATABASE_URL to run)', () => {
  let pool: Pool;
  let repo: PgBookingRepository;
  let capacity: PgCapacityRepository;
  const day = '2101-03-01';

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(migration('004_visit_limits_and_bookings.sql'));
    capacity = new PgCapacityRepository(pool);
    await capacity.setLimit(day, 5);
    // A booking written before migration 006 must stay readable afterwards.
    await capacity.book(day, '08:00-11:00', 'legacy-customer');
    await pool.query(migration('006_home_visit_booking.sql'));
    repo = new PgBookingRepository(pool);
  });
  afterAll(async () => {
    await pool?.end();
  });

  it('keeps legacy bookings readable with no service or address', async () => {
    const rows = await capacity.listBookings(day);
    expect(rows.find((b) => b.customerId === 'legacy-customer')).toMatchObject({ service: null, address: null });
  });

  it('lists only services in the category and only the customer\'s addresses', async () => {
    expect((await repo.listServices('heat')).map((s) => s.id)).toContain('boiler-service');
    expect((await repo.listServices('heat')).map((s) => s.id)).not.toContain('washer');
    const mine = `addr-${randomUUID()}`;
    const theirs = `addr-${randomUUID()}`;
    await pool.query(
      `INSERT INTO addresses (id, customer_id, label, line, time_zone) VALUES
       ($1, 'cust-a', 'Home', '1 Test St', 'Europe/London'), ($2, 'cust-b', 'Home', '2 Test St', 'Europe/London')`,
      [mine, theirs],
    );
    expect((await repo.listAddresses('cust-a')).map((a) => a.id)).toContain(mine);
    expect((await repo.listAddresses('cust-a')).map((a) => a.id)).not.toContain(theirs);
    expect(await repo.getAddress('cust-a', theirs)).toBeNull();
  });

  it('stores the service, address and fee on the booking', async () => {
    const addr = `addr-${randomUUID()}`;
    await pool.query(
      "INSERT INTO addresses (id, customer_id, label, line, time_zone) VALUES ($1, 'cust-a', 'Home', '1 Test St', 'Europe/London')",
      [addr],
    );
    const res = await capacity.book(day, '11:00-14:00', 'cust-a', {
      serviceId: 'boiler-service',
      addressId: addr,
      visitFee: 35,
      feeCurrency: 'GBP',
    });
    expect(res.outcome).toBe('confirmed');
    const { rows } = await pool.query(
      'SELECT customer_id, service_id, address_id, visit_fee::float AS fee, fee_currency FROM bookings WHERE id = $1',
      [(res as { bookingId: string }).bookingId],
    );
    expect(rows[0]).toEqual({
      customer_id: 'cust-a',
      service_id: 'boiler-service',
      address_id: addr,
      fee: 35,
      fee_currency: 'GBP',
    });
  });
});
