import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgSpinRepository } from './pg-spin.repository';
import type { Grid } from './spin.constants';
import type { SpinRecord } from './spin.record';

const url = process.env.TEST_DATABASE_URL;
const POOL = 'test-pool';

function record(playerId: string): SpinRecord {
  const grid = [0, 1, 2].map(() => Array(5).fill('S1')) as Grid;
  return { id: randomUUID(), playerId, bet: 5, grid, jackpotTrigger: false, spunAt: new Date() };
}

describe.skipIf(!url)('PgSpinRepository (set TEST_DATABASE_URL to run)', () => {
  let pool: Pool;
  let repo: PgSpinRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(readFileSync(join(__dirname, '../../migrations/001_spin_records.sql'), 'utf8'));
    await pool.query(readFileSync(join(__dirname, '../../migrations/002_free_game_states.sql'), 'utf8'));
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

  it('stores a free-game award that a fresh repository reads back (AC6)', async () => {
    const playerId = randomUUID();
    await repo.saveWithJackpot(record(playerId), handoff, 10);
    expect(await new PgSpinRepository(pool).getFreeGames(playerId)).toEqual({
      awarded: 0,
      remaining: 10,
    });
  });

  it('treats a player with spins but no free-game row as 0 remaining', async () => {
    const playerId = randomUUID();
    await repo.saveWithJackpot(record(playerId), handoff);
    expect(await repo.getFreeGames(playerId)).toEqual({ awarded: 0, remaining: 0 });
  });

  it('does not re-trigger while free games are in progress (AC9)', async () => {
    const playerId = randomUUID();
    await repo.saveWithJackpot(record(playerId), handoff, 10);
    expect(await repo.saveWithJackpot(record(playerId), handoff, 20)).toEqual({
      awarded: 0,
      remaining: 10,
    });
  });

  it('awards once for concurrent triggering spins', async () => {
    const playerId = randomUUID();
    const results = await Promise.all([
      repo.saveWithJackpot(record(playerId), handoff, 10),
      repo.saveWithJackpot(record(playerId), handoff, 10),
    ]);
    expect(results.filter((r) => r.awarded === 10)).toHaveLength(1);
    expect((await repo.getFreeGames(playerId)).remaining).toBe(10);
  });
});
