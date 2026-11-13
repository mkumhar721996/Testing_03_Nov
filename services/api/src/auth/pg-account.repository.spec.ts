import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Account } from './account.repository';
import { PgAccountRepository } from './pg-account.repository';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('PgAccountRepository (set TEST_DATABASE_URL to run)', () => {
  let pool: Pool;
  let repo: PgAccountRepository;
  const account = (email: string): Account => ({ id: randomUUID(), email, passwordHash: 'scrypt$s$h', role: 'customer' });

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(readFileSync(join(__dirname, '../../migrations/006_accounts.sql'), 'utf8'));
    repo = new PgAccountRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('stores an account and refuses the same email in another case (AC7)', async () => {
    const email = `${randomUUID()}@Example.com`;
    const a = account(email);
    expect(await repo.create(a)).toBe(true);
    expect(await repo.create(account(email.toLowerCase()))).toBe(false);
    expect(await repo.findByEmail(email.toUpperCase())).toMatchObject({ id: a.id, role: 'customer' });
  });

  it('has no phone column (AC6) and a role CHECK (AC8)', async () => {
    const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'accounts'");
    expect(rows.map((r) => r.column_name)).not.toContain('phone');
    await expect(
      pool.query("INSERT INTO accounts (id, email, password_hash, role) VALUES ($1, 'x@y.co', 'h', 'owner')", [randomUUID()]),
    ).rejects.toThrow();
  });

  it('finds only unexpired sessions and deletes them', async () => {
    const a = account(`${randomUUID()}@example.com`);
    await repo.create(a);
    const now = new Date();
    await repo.createSession('live-' + a.id, a.id, new Date(now.getTime() + 1000));
    expect((await repo.findSession('live-' + a.id, now))?.id).toBe(a.id);
    expect(await repo.findSession('live-' + a.id, new Date(now.getTime() + 1000))).toBeUndefined();
    await repo.deleteSession('live-' + a.id);
    expect(await repo.findSession('live-' + a.id, now)).toBeUndefined();
  });

  it('counts consecutive failures, restarts after the window, and clears', async () => {
    const email = `${randomUUID()}@example.com`;
    const t = new Date();
    await repo.recordFailure(email, t, 900_000);
    await repo.recordFailure(email, new Date(t.getTime() + 1000), 900_000);
    expect((await repo.getAttempts(email))?.failedCount).toBe(2);
    await repo.recordFailure(email, new Date(t.getTime() + 2_000_000), 900_000);
    expect((await repo.getAttempts(email))?.failedCount).toBe(1);
    await repo.clearAttempts(email);
    expect(await repo.getAttempts(email)).toBeUndefined();
  });
});
