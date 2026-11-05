import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { JackpotHandoff, JackpotPolicy } from './jackpot.handoff';
import type { PlayerRepository } from '../player/player.repository';
import type { Grid } from './spin.constants';
import type { SpinRecord } from './spin.record';
import type { SpinRepository } from './spin.repository';
import { evaluateSpin } from './spin.evaluator';
import { SpinService } from './spin.service';

const GUEST_ID = '6f1c1c0e-5a0e-4a63-9a3b-2f1d7a1e8c11';
const FIXED: Grid = [0, 1, 2].map(() => ['S2', 'S3', 'S4', 'S5', 'S6']) as Grid;

class MemoryRepo implements SpinRepository {
  saved: SpinRecord[] = [];
  handoffs: JackpotHandoff[] = [];
  async saveWithJackpot(record: SpinRecord, handoff: JackpotHandoff) {
    this.saved.push(record);
    this.handoffs.push(handoff);
  }
  async findByPlayer(playerId: string) {
    return this.saved.filter((r) => r.playerId === playerId);
  }
}

function setup({ trigger = false, balance = 100 } = {}) {
  const repo = new MemoryRepo();
  const policy: JackpotPolicy = {
    decide: () => ({ pool: 'test-pool', contribution: 0.05, trigger }),
  };
  const service = new SpinService(repo, policy, () => FIXED, { getBalance: async () => balance } as PlayerRepository);
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

  it('stores bet, grid and total win (AC11)', async () => {
    const { service, repo } = setup();
    const out = await service.spin('guest-1', 5);
    expect(repo.saved[0]).toMatchObject({
      bet: 5,
      grid: out.grid,
      totalWin: out.evaluation.totalWin,
    });
  });

  it('stores a positive total win for a winning grid (AC11)', async () => {
    const repo = new MemoryRepo();
    const policy: JackpotPolicy = {
      decide: () => ({ pool: 'test-pool', contribution: 0, trigger: false }),
    };
    const winning: Grid = [0, 1, 2].map(() => Array(5).fill('S3')) as Grid;
    const service = new SpinService(repo, policy, () => winning, { getBalance: async () => 100 } as PlayerRepository);
    const out = await service.spin('guest-1', 10);
    expect(repo.saved[0].totalWin).toBeGreaterThan(0);
    expect(repo.saved[0].totalWin).toBe(out.evaluation.totalWin);
  });

  it('hands the contribution to the pools once per spin (AC4)', async () => {
    const { service, repo } = setup();
    await Promise.all([service.spin('a', 5), service.spin('b', 5)]);
    expect(repo.handoffs).toHaveLength(2);
  });

  it('stores jackpot trigger set (AC5)', async () => {
    const { service, repo } = setup({ trigger: true });
    const out = await service.spin('guest-1', 5);
    expect(repo.saved[0].jackpotTrigger).toBe(true);
    expect(out.jackpotTrigger).toBe(true);
  });

  it('stores jackpot trigger not set (AC6)', async () => {
    const { service, repo } = setup({ trigger: false });
    await service.spin('guest-1', 5);
    expect(repo.saved[0].jackpotTrigger).toBe(false);
  });

  it('rejects a bet that is not allowed', async () => {
    const { service, repo } = setup();
    await expect(service.spin('guest-1', 7)).rejects.toThrow();
    expect(repo.saved).toHaveLength(0);
  });

  it('rejects a bet of 4 with a balance of 100 (AC9)', async () => {
    const { service } = setup({ balance: 100 });
    await expect(service.spin('guest-1', 4)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a bet of 10 with a balance of 7 (AC10)', async () => {
    const { service, repo } = setup({ balance: 7 });
    await expect(service.spin('guest-1', 10)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.saved).toHaveLength(0);
  });

  it('accepts a bet of 10 with a balance of 10 (AC11)', async () => {
    const { service, repo } = setup({ balance: 10 });
    await expect(service.spin('guest-1', 10)).resolves.toMatchObject({ bet: 10 });
    expect(repo.saved).toHaveLength(1);
  });

  it('latest returns the most recent spin with spunAt and its evaluation', async () => {
    const { service } = setup();
    await service.spin('guest-1', 5);
    const out = await service.latest('guest-1');
    expect(out.grid).toEqual(FIXED);
    expect(out.evaluation.totalWin).toBe(evaluateSpin(FIXED, 5).totalWin);
    expect(out.spunAt).toBeInstanceOf(Date);
  });

  it('latest throws NotFound with no spins', async () => {
    const { service } = setup();
    await expect(service.latest('nobody')).rejects.toBeInstanceOf(NotFoundException);
  });
});
