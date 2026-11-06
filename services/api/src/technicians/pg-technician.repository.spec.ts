import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgTechnicianRepository } from './pg-technician.repository';
import { DuplicateEmailError } from './technician.repository';

const url = process.env.TEST_DATABASE_URL;

const migration = (name: string) => readFileSync(join(__dirname, '../../migrations', name), 'utf8');

describe.skipIf(!url)('PgTechnicianRepository (set TEST_DATABASE_URL to run)', () => {
  let pool: Pool;
  let repo: PgTechnicianRepository;
  const email = () => `${randomUUID()}@x.example`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    for (const m of ['003_players.sql', '004_technicians.sql', '005_jobs.sql']) await pool.query(migration(m));
    await pool.query(migration('005_jobs.sql'));
    repo = new PgTechnicianRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates an active technician with only name and email', async () => {
    const t = await repo.create({ name: 'A', loginEmail: email() });
    expect(t).toMatchObject({ name: 'A', active: true, phone: null });
  });

  it('rejects a duplicate email regardless of case', async () => {
    const e = email();
    await repo.create({ name: 'A', loginEmail: e });
    await expect(repo.create({ name: 'B', loginEmail: e.toUpperCase() })).rejects.toBeInstanceOf(DuplicateEmailError);
  });

  it('keeps the old schedule when a replace is refused (AC15)', async () => {
    const t = await repo.create({ name: 'A', loginEmail: email() });
    const saved = [{ weekday: 1, start: '08:00', end: '16:00' }];
    await repo.replaceWeeklyHours(t.id, saved);
    await expect(
      repo.replaceWeeklyHours(t.id, [
        { weekday: 2, start: '08:00', end: '12:00' },
        { weekday: 3, start: '17:00', end: '09:00' },
      ]),
    ).rejects.toThrow();
    expect((await repo.get(t.id))?.workingHours).toEqual(saved);
  });

  it('stores days off idempotently', async () => {
    const t = await repo.create({ name: 'A', loginEmail: email() });
    await repo.addDayOff(t.id, '2026-11-12');
    await repo.addDayOff(t.id, '2026-11-12');
    expect((await repo.get(t.id))?.daysOff).toEqual(['2026-11-12']);
  });

  it('leaves held jobs assigned when deactivated and hides the technician from assignable (AC8, AC9)', async () => {
    const t = await repo.create({ name: 'A', loginEmail: email() });
    const ids = [randomUUID(), randomUUID()];
    for (const id of ids) {
      await pool.query(
        `INSERT INTO jobs (id, title, customer, scheduled_date, technician_id) VALUES ($1, 't', 'c', '2026-11-12', $2)`,
        [id, t.id],
      );
    }
    await repo.setActive(t.id, false);
    expect((await repo.jobsHeldBy(t.id)).map((j) => j.technicianId)).toEqual([t.id, t.id]);
    expect((await repo.listAssignable()).some((x) => x.id === t.id)).toBe(false);
    expect((await repo.jobsHeldBy(t.id, '2026-11-13'))).toEqual([]);
  });
});
