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

  it('gives an unknown player 100 without storing a row', async () => {
    const id = randomUUID();
    expect(await repo.getBalance(id)).toBe(100);
    const { rows } = await pool.query('SELECT 1 FROM players WHERE id = $1', [id]);
    expect(rows).toHaveLength(0);
  });

  it('returns a stored balance', async () => {
    const id = randomUUID();
    await pool.query('INSERT INTO players (id, balance) VALUES ($1, 37)', [id]);
    expect(await repo.getBalance(id)).toBe(37);
    expect(await repo.getBalance(id)).toBe(37);
  });
});
