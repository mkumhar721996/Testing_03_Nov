import { describe, expect, it } from 'vitest';
import type { JackpotHandoff, JackpotPolicy } from './jackpot.handoff';
import type { Grid } from './spin.constants';
import type { FreeGamesState, SpinRecord } from './spin.record';
import type { SpinRepository } from './spin.repository';
import { SpinService } from './spin.service';

const GUEST_ID = '6f1c1c0e-5a0e-4a63-9a3b-2f1d7a1e8c11';
const FIXED: Grid = [0, 1, 2].map(() => ['S2', 'S3', 'S4', 'S5', 'S6']) as Grid;

class MemoryRepo implements SpinRepository {
  saved: SpinRecord[] = [];
  handoffs: JackpotHandoff[] = [];
  remaining = new Map<string, number>();
  async saveWithJackpot(
    record: SpinRecord,
    handoff: JackpotHandoff,
    freeGamesAward = 0,
  ): Promise<FreeGamesState> {
    this.saved.push(record);
    this.handoffs.push(handoff);
    const current = this.remaining.get(record.playerId) ?? 0;
    const awarded = freeGamesAward > 0 && current === 0 ? freeGamesAward : 0;
    if (awarded) this.remaining.set(record.playerId, awarded);
    return { awarded, remaining: this.remaining.get(record.playerId) ?? 0 };
  }
  async getFreeGames(playerId: string): Promise<FreeGamesState> {
    return { awarded: 0, remaining: this.remaining.get(playerId) ?? 0 };
  }
  async findByPlayer(playerId: string) {
    return this.saved.filter((r) => r.playerId === playerId);
  }
}

function gridWithScatters(n: number): Grid {
  const grid = [0, 1, 2].map(() => ['S2', 'S3', 'S4', 'S5', 'S6']) as Grid;
  for (let i = 0; i < n; i++) grid[i % 3][i % 5] = 'SCATTER';
  return grid;
}

function setup(trigger = false, grid: Grid = FIXED) {
  const repo = new MemoryRepo();
  const policy: JackpotPolicy = {
    decide: () => ({ pool: 'test-pool', contribution: 0.05, trigger }),
  };
  const service = new SpinService(repo, policy, () => grid);
  return { repo, policy, service };
}

describe('SpinService', () => {
  it('never uses a client-sent grid (AC1, AC2)', async () => {
    const { service, repo } = setup();
    const clientGrid = [0, 1, 2].map(() => Array(5).fill('S1'));
    const out = await (service.spin as (...a: unknown[]) => Promise<{ grid: Grid }>)(
      GUEST_ID,
      5,
      { grid: clientGrid },
    );
    expect(out.grid).not.toEqual(clientGrid);
    expect(out.grid).toEqual(FIXED);
    expect(repo.saved[0].grid).toEqual(out.grid);
  });

  it('stores grid, bet, player id and time (AC3)', async () => {
    const { service, repo } = setup();
    const out = await service.spin('guest-1', 5);
    const [rec] = await repo.findByPlayer('guest-1');
    expect(rec).toMatchObject({ playerId: 'guest-1', bet: 5, grid: out.grid });
    expect(rec.spunAt).toBeInstanceOf(Date);
  });

  it('hands the contribution to the pools once per spin (AC4)', async () => {
    const { service, repo } = setup();
    await Promise.all([service.spin('a', 5), service.spin('b', 5)]);
    expect(repo.handoffs).toHaveLength(2);
  });

  it('stores jackpot trigger set (AC5)', async () => {
    const { service, repo } = setup(true);
    const out = await service.spin('guest-1', 5);
    expect(repo.saved[0].jackpotTrigger).toBe(true);
    expect(out.jackpotTrigger).toBe(true);
  });

  it('stores jackpot trigger not set (AC6)', async () => {
    const { service, repo } = setup(false);
    await service.spin('guest-1', 5);
    expect(repo.saved[0].jackpotTrigger).toBe(false);
  });

  it('rejects a bet that is not allowed', async () => {
    const { service, repo } = setup();
    await expect(service.spin('guest-1', 7)).rejects.toThrow();
    expect(repo.saved).toHaveLength(0);
  });

  it.each([
    [3, 10],
    [4, 15],
    [5, 20],
  ])('%i scatters award %i free games, recorded on the server (AC1-AC3)', async (n, award) => {
    const { service, repo } = setup(false, gridWithScatters(n));
    const out = await service.spin('guest-1', 5);
    expect(out.scatterCount).toBe(n);
    expect(out.freeGames).toEqual({ awarded: award, remaining: award });
    expect((await repo.getFreeGames('guest-1')).remaining).toBe(award);
  });

  it('awards nothing for 2 scatters (AC4)', async () => {
    const { service } = setup(false, gridWithScatters(2));
    const out = await service.spin('guest-1', 5);
    expect(out.freeGames).toEqual({ awarded: 0, remaining: 0 });
  });

  it('awards nothing when the save fails (AC5)', async () => {
    const { service, repo } = setup(false, gridWithScatters(3));
    repo.saveWithJackpot = async () => {
      throw new Error('db down');
    };
    await expect(service.spin('guest-1', 5)).rejects.toThrow();
    expect((await repo.getFreeGames('guest-1')).remaining).toBe(0);
  });

  it('does not re-trigger while free games are in progress (AC9)', async () => {
    const repo = new MemoryRepo();
    const policy: JackpotPolicy = { decide: () => ({ pool: 'p', contribution: 0, trigger: false }) };
    const grids = [gridWithScatters(3), gridWithScatters(5)];
    const service = new SpinService(repo, policy, () => grids.shift() as Grid);
    await service.spin('guest-1', 5);
    const second = await service.spin('guest-1', 5);
    expect(second.freeGames).toEqual({ awarded: 0, remaining: 10 });
  });
});
