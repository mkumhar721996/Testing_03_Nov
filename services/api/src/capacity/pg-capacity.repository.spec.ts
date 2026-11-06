import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgCapacityRepository } from './pg-capacity.repository';

const url = process.env.TEST_DATABASE_URL;
const migration = (name: string) => readFileSync(join(__dirname, '../../migrations', name), 'utf8');

let counter = Math.floor(Math.random() * 20000);
/** A fresh far-future day so runs never collide. */
function freshDay(): string {
  const d = new Date(Date.UTC(2100, 0, 1) + counter++ * 86_400_000);
  return d.toISOString().slice(0, 10);
}

describe.skipIf(!url)('PgCapacityRepository (set TEST_DATABASE_URL to run)', () => {
  let pool: Pool;
  let repo: PgCapacityRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(migration('004_visit_limits_and_bookings.sql'));
    repo = new PgCapacityRepository(pool);
  });
  afterAll(async () => {
    await pool?.end();
  });

  it('keeps one row per day with the latest limit (AC1)', async () => {
    const day = freshDay();
    await repo.setLimit(day, 4);
    await repo.setLimit(day, 6);
    expect(await repo.getDay(day)).toEqual({ day, limit: 6, booked: 0 });
    const { rows } = await pool.query('SELECT 1 FROM visit_limits WHERE day = $1', [day]);
    expect(rows).toHaveLength(1);
  });

  it('confirms only one of two simultaneous bookings for the last place (AC4)', async () => {
    for (let i = 0; i < 20; i++) {
      const day = freshDay();
      await repo.setLimit(day, 3);
      await repo.book(day, '08:00-11:00', 'x1');
      await repo.book(day, '08:00-11:00', 'x2');
      const results = await Promise.all([
        repo.book(day, '08:00-11:00', 'a'),
        repo.book(day, '08:00-11:00', 'b'),
      ]);
      expect(results.filter((r) => r.outcome === 'confirmed')).toHaveLength(1);
      expect(results.filter((r) => r.outcome === 'full')).toHaveLength(1);
      expect(await repo.getDay(day)).toMatchObject({ booked: 3 });
    }
  });

  it('confirms with a place left (AC5)', async () => {
    const day = freshDay();
    await repo.setLimit(day, 5);
    for (let i = 0; i < 4; i++) await repo.book(day, '08:00-11:00', `u${i}`);
    expect((await repo.book(day, '11:00-14:00', 'z')).outcome).toBe('confirmed');
  });

  it('refuses a day with no limit and inserts nothing (AC8)', async () => {
    const day = freshDay();
    expect(await repo.book(day, '08:00-11:00', 'a')).toEqual({ outcome: 'no_limit' });
    expect((await repo.listBookings(day))).toHaveLength(0);
  });

  it('keeps bookings confirmed when the limit is lowered, and refuses more (AC9, AC10)', async () => {
    const day = freshDay();
    await repo.setLimit(day, 5);
    for (let i = 0; i < 5; i++) await repo.book(day, '14:00-17:00', randomUUID());
    await repo.setLimit(day, 3);
    const bookings = await repo.listBookings(day);
    expect(bookings).toHaveLength(5);
    expect(bookings.every((b) => b.status === 'confirmed')).toBe(true);
    expect(await repo.book(day, '08:00-11:00', 'late')).toEqual({ outcome: 'full' });
  });
});
