import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgAccountRepository } from './pg-account.repository';
import { hashPassword } from './password.hasher';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('PgAccountRepository (set TEST_DATABASE_URL to run)', () => {
  let pool: Pool;
  let repo: PgAccountRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(readFileSync(join(__dirname, '../../migrations/006_accounts.sql'), 'utf8'));
    repo = new PgAccountRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  const account = async (email: string, role: 'customer' | 'technician' | 'admin' = 'customer') => ({
    id: randomUUID(),
    email,
    passwordHash: await hashPassword('Passw0rd1'),
    role,
  });

  it('stores a hash, not the password, and finds the account case-insensitively', async () => {
    const a = await account(`${randomUUID()}@example.com`);
    expect(await repo.create(a)).toBe(true);
    const stored = await repo.findByEmail(a.email.toUpperCase());
    expect(stored?.passwordHash).not.toContain('Passw0rd1');
    expect(stored?.role).toBe('customer');
  });

  it('refuses a duplicate email whatever its case', async () => {
    const a = await account(`${randomUUID()}@example.com`);
    await repo.create(a);
    expect(await repo.create({ ...(await account(a.email.toUpperCase())) })).toBe(false);
  });

  it.each(['technician', 'admin'] as const)('keeps a %s role', async (role) => {
    const a = await account(`${randomUUID()}@example.com`, role);
    await repo.create(a);
    expect((await repo.findByEmail(a.email))?.role).toBe(role);
  });

  it('rejects a role outside the three', async () => {
    await expect(
      pool.query("INSERT INTO accounts (id,email,password_hash,role) VALUES ($1,$2,'h','owner')", [
        randomUUID(),
        `${randomUUID()}@example.com`,
      ]),
    ).rejects.toThrow();
  });

  it('has no phone column', async () => {
    const { rows } = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'accounts' AND column_name ILIKE '%phone%'",
    );
    expect(rows).toHaveLength(0);
  });

  it('finds a session until it expires and deletes it', async () => {
    const a = await account(`${randomUUID()}@example.com`);
    await repo.create(a);
    const hash = randomUUID();
    const now = new Date();
    await repo.createSession(hash, a.id, new Date(now.getTime() + 1000));
    expect((await repo.findSession(hash, now))?.id).toBe(a.id);
    expect(await repo.findSession(hash, new Date(now.getTime() + 2000))).toBeUndefined();
    await repo.deleteSession(hash);
    expect(await repo.findSession(hash, now)).toBeUndefined();
  });

  it('counts, reads and clears failed attempts', async () => {
    const email = `${randomUUID()}@example.com`;
    const now = new Date();
    expect(await repo.getAttempts(email)).toBeUndefined();
    expect(await repo.reserveAttempt(email, now, 5, 900_000)).toBe(true);
    expect(await repo.reserveAttempt(email, now, 5, 900_000)).toBe(true);
    expect((await repo.getAttempts(email))?.failedCount).toBe(2);
    await repo.clearAttempts(email);
    expect(await repo.getAttempts(email)).toBeUndefined();
  });

  it('reserves at most the limit in parallel, then refuses without moving the stamp', async () => {
    const email = `${randomUUID()}@example.com`;
    const now = new Date();
    const results = await Promise.all(
      Array.from({ length: 12 }, () => repo.reserveAttempt(email, now, 5, 900_000)),
    );
    expect(results.filter(Boolean)).toHaveLength(5);
    const later = new Date(now.getTime() + 60_000);
    expect(await repo.reserveAttempt(email, later, 5, 900_000)).toBe(false);
    expect((await repo.getAttempts(email))?.lastFailedAt.getTime()).toBe(now.getTime());
    const expired = new Date(now.getTime() + 900_000);
    expect(await repo.reserveAttempt(email, expired, 5, 900_000)).toBe(true);
    expect((await repo.getAttempts(email))?.failedCount).toBe(1);
  });
});
