import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgPlayerRepository } from '../player/pg-player.repository';
import { InsufficientBalanceError } from './spin.repository';
import { PgSpinRepository } from './pg-spin.repository';
import type { Grid } from './spin.constants';
import { evaluateSpin } from './spin.evaluator';
import type { SpinRecord } from './spin.record';

const url = process.env.TEST_DATABASE_URL;
const POOL = 'test-pool';

function record(playerId: string): SpinRecord {
  const grid = [0, 1, 2].map(() => Array(5).fill('S1')) as Grid;
  return {
    id: randomUUID(),
    playerId,
    bet: 5,
    grid,
    totalWin: 0,
    jackpotTrigger: false,
    spunAt: new Date(),
  };
}

const migration = (name: string) => readFileSync(join(__dirname, '../../migrations', name), 'utf8');

describe.skipIf(!url)('PgSpinRepository (set TEST_DATABASE_URL to run)', () => {
  let pool: Pool;
  let repo: PgSpinRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(migration('001_spin_records.sql'));
    await pool.query(migration('002_spin_total_win.sql'));
    await pool.query(migration('003_players.sql'));
    await pool.query(
      'INSERT INTO jackpot_pools (pool) VALUES ($1) ON CONFLICT DO NOTHING',
      [POOL],
    );
    repo = new PgSpinRepository(pool);
  });
  afterAll(async () => {
    await pool?.end();
  });

  it('stores and reads back a record with its trigger flag', async () => {
    const playerId = randomUUID();
    const rec = { ...record(playerId), jackpotTrigger: true };
    await repo.saveWithJackpot(rec, { pool: POOL, contribution: 0, trigger: true });
    const [found] = await repo.findByPlayer(playerId);
    expect(found).toMatchObject({ playerId, bet: 5, grid: rec.grid, jackpotTrigger: true });
    expect(found.spunAt).toBeInstanceOf(Date);
  });

  it('stores and reads back bet, grid and total win (AC11)', async () => {
    const playerId = randomUUID();
    const rec = { ...record(playerId), totalWin: 12.5 };
    await repo.saveWithJackpot(rec, { pool: POOL, contribution: 0, trigger: false });
    const [found] = await repo.findByPlayer(playerId);
    expect(found).toMatchObject({ bet: 5, grid: rec.grid, totalWin: 12.5 });
  });

  it('reads a legacy row without total_win by recomputing it, and 002 is idempotent', async () => {
    const playerId = randomUUID();
    const grid = [0, 1, 2].map(() => Array(5).fill('S3')) as Grid;
    await pool.query(
      `INSERT INTO spin_records (id, player_id, bet, grid, jackpot_trigger)
       VALUES ($1, $2, 5, $3, false)`,
      [randomUUID(), playerId, JSON.stringify(grid)],
    );
    await pool.query(migration('002_spin_total_win.sql'));
    const [found] = await repo.findByPlayer(playerId);
    expect(found.totalWin).toBe(evaluateSpin(found.grid, found.bet).totalWin);
  });

  it('counts concurrent contributions exactly once', async () => {
    const before = await repo.poolAmount(POOL);
    const handoff = { pool: POOL, contribution: 0.05, trigger: false };
    await Promise.all([
      repo.saveWithJackpot(record(randomUUID()), handoff),
      repo.saveWithJackpot(record(randomUUID()), handoff),
    ]);
    expect(await repo.poolAmount(POOL)).toBeCloseTo(before + 0.1, 2);
  });

  it('leaves the pool unchanged when the insert fails', async () => {
    const before = await repo.poolAmount(POOL);
    const bad = { ...record(randomUUID()), id: 'not-a-uuid' };
    await expect(
      repo.saveWithJackpot(bad, { pool: POOL, contribution: 0.05, trigger: false }),
    ).rejects.toThrow();
    expect(await repo.poolAmount(POOL)).toBeCloseTo(before, 2);
  });

  const handoff = { pool: POOL, contribution: 0, trigger: false };

  it('takes the stake from a player with no row (AC1)', async () => {
    const id = randomUUID();
    expect(await repo.saveWithJackpot(record(id), handoff)).toBe(95);
    expect(await new PgPlayerRepository(pool).getBalance(id)).toBe(95);
  });

  it('takes the stake from a stored balance (AC1)', async () => {
    const id = randomUUID();
    await pool.query('INSERT INTO players (id, balance) VALUES ($1, 100)', [id]);
    await repo.saveWithJackpot(record(id), handoff);
    expect(await new PgPlayerRepository(pool).getBalance(id)).toBe(95);
  });

  it('charges nothing when the insert fails, and once for the retry (AC2, AC3)', async () => {
    const id = randomUUID();
    const players = new PgPlayerRepository(pool);
    await expect(repo.saveWithJackpot({ ...record(id), id: 'not-a-uuid' }, handoff)).rejects.toThrow();
    expect(await players.getBalance(id)).toBe(100);
    await repo.saveWithJackpot(record(id), handoff);
    expect(await players.getBalance(id)).toBe(95);
  });

  it('refuses a stake the balance cannot cover and stores nothing (AC6)', async () => {
    const id = randomUUID();
    await pool.query('INSERT INTO players (id, balance) VALUES ($1, 3)', [id]);
    await expect(repo.saveWithJackpot(record(id), handoff)).rejects.toBeInstanceOf(InsufficientBalanceError);
    expect(await new PgPlayerRepository(pool).getBalance(id)).toBe(3);
    expect(await repo.findByPlayer(id)).toHaveLength(0);
  });
});
