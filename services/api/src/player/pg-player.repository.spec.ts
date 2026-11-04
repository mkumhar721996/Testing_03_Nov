import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgPlayerRepository } from './pg-player.repository';

const url = process.env.TEST_DATABASE_URL;

const migration = (name: string) => readFileSync(join(__dirname, '../../migrations', name), 'utf8');

describe.skipIf(!url)('PgPlayerRepository (set TEST_DATABASE_URL to run)', () => {
  let pool: Pool;
  let repo: PgPlayerRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(migration('001_spin_records.sql'));
    await pool.query(migration('002_spin_total_win.sql'));
    await pool.query(migration('003_players.sql'));
    repo = new PgPlayerRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates an unknown player with 100', async () => {
    expect(await repo.getOrCreateBalance(randomUUID())).toBe(100);
  });

  it('returns a stored balance without resetting it', async () => {
    const id = randomUUID();
    await repo.getOrCreateBalance(id);
    await pool.query('UPDATE players SET balance = 37 WHERE id = $1', [id]);
    expect(await repo.getOrCreateBalance(id)).toBe(37);
    expect(await repo.getOrCreateBalance(id)).toBe(37);
  });

  it('keeps one row for two concurrent first calls', async () => {
    const id = randomUUID();
    const results = await Promise.all([repo.getOrCreateBalance(id), repo.getOrCreateBalance(id)]);
    expect(results).toEqual([100, 100]);
    const { rows } = await pool.query('SELECT 1 FROM players WHERE id = $1', [id]);
    expect(rows).toHaveLength(1);
  });
});
