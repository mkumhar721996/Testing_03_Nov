import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgAuthRepository } from './pg-auth.repository';
import { PgSpinRepository } from '../spin/pg-spin.repository';
import { newToken } from './tokens';

const url = process.env.TEST_DATABASE_URL;
const migration = (name: string) => readFileSync(join(__dirname, '../../migrations', name), 'utf8');

describe.skipIf(!url)('PgAuthRepository (set TEST_DATABASE_URL to run)', () => {
  let pool: Pool;
  let repo: PgAuthRepository;

  async function newUser() {
    const id = randomUUID();
    await repo.createUser({ id, email: `${id}@Northwind.example`, name: 'Test', passwordHash: 'hash' });
    return id;
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(migration('001_spin_records.sql'));
    const playerId = randomUUID();
    await pool.query(
      `INSERT INTO spin_records (id, player_id, bet, grid, jackpot_trigger)
       VALUES ($1, $2, 5, '[]', false)`,
      [randomUUID(), playerId],
    );
    await pool.query(migration('002_auth.sql'));
    expect(await new PgSpinRepository(pool).findByPlayer(playerId)).toHaveLength(1);
    repo = new PgAuthRepository(pool);
  });
  afterAll(async () => {
    await pool?.end();
  });

  it('finds a user by email regardless of case and refuses a duplicate', async () => {
    const id = await newUser();
    const found = await repo.findUserByEmail(`${id}@NORTHWIND.example`);
    expect(found?.id).toBe(id);
    await expect(
      repo.createUser({ id: randomUUID(), email: `${id}@northwind.example`, name: 'X', passwordHash: 'h' }),
    ).rejects.toThrow();
  });

  it('locks on the 5th failure and does not extend a running lock', async () => {
    const id = await newUser();
    const t0 = new Date('2026-01-01T10:00:00Z');
    for (let i = 1; i <= 4; i++) {
      expect((await repo.recordFailedAttempt(id, t0, 5, 900_000)).lockedUntil).toBeNull();
    }
    const fifth = await repo.recordFailedAttempt(id, t0, 5, 900_000);
    expect(fifth.lockedUntil).toEqual(new Date(t0.getTime() + 900_000));
    const later = await repo.recordFailedAttempt(id, new Date(t0.getTime() + 60_000), 5, 900_000);
    expect(later.lockedUntil).toEqual(fifth.lockedUntil);
  });

  it('counts concurrent failures without losing one', async () => {
    const id = await newUser();
    const now = new Date();
    await Promise.all(Array.from({ length: 3 }, () => repo.recordFailedAttempt(id, now, 5, 900_000)));
    expect((await repo.findUserByEmail(`${id}@northwind.example`))?.failedAttempts).toBe(3);
  });

  it('lets exactly one of two concurrent uses consume a reset token', async () => {
    const userId = await newUser();
    const { tokenHash } = newToken();
    const now = new Date();
    await repo.createResetToken({ tokenHash, userId, expiresAt: new Date(now.getTime() + 60_000) });
    const results = await Promise.all([
      repo.consumeResetToken(tokenHash, now),
      repo.consumeResetToken(tokenHash, now),
    ]);
    expect(results.filter((r) => r === userId)).toHaveLength(1);
    expect(await repo.resetTokenState(tokenHash, now)).toBe('invalid');
  });

  it('stores, slides and deletes a session; it expires', async () => {
    const userId = await newUser();
    const { tokenHash } = newToken();
    const now = new Date();
    await repo.createSession({ tokenHash, userId, expiresAt: new Date(now.getTime() + 60_000) });
    expect(await repo.findSession(tokenHash, now)).not.toBeNull();
    expect(await repo.findSession(tokenHash, new Date(now.getTime() + 61_000))).toBeNull();
    await repo.deleteSession(tokenHash);
    expect(await repo.findSession(tokenHash, now)).toBeNull();
  });
});
